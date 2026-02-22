title: 基于protobuf开发的rpc框架
date: 2025-03-31 05:34:00
categories: 开发调优
tags: [C++]
---
RPC（Remote Procedure Call Protocol）远程过程调用协议，过程示意图![image-20250330212348735](https://images.guangyin.blog/2025/03/44ccc76fa6bd1499a6dd5e00a401ce86.webp)

### 一、提供方配置

#### 1.1、生成服务对象

要提供RPC服务，需要在proto中添加`service`信息，protoc会为每个service生成对应的C++类，包含虚函数，用户需要继承并实现这些函数。但这些生成的代码并不处理实际的网络通信，只是提供了一个框架，需要用户自己填充具体的逻辑，或者结合其他RPC库使用。

```protobuf
syntax = "proto3";

package friendservice;

//当cc_generic_services为true时，protoc会为每个service生成对应的C++类，包含虚函数，用户需要继承并实现这些函数。
option cc_generic_services = true;

message ResultCode
{
    int32 errCode = 1;
    bytes errMsg = 2;
}

message GetFriendListRequest
{
    uint32 userid = 1;
}

message GetFriendListResponse
{
    ResultCode result = 1;
    repeated bytes friends = 2;
}

service FriendServiceRpc
{
    rpc GetFriendList(GetFriendListRequest) returns(GetFriendListResponse);
}
```

#### 1.2、提取服务

protobuf会为每一个service生成对应的抽象描述，具体实现需要我们继承这些类并实现对应的方法，然后通过protobuf内部实现的多态进行调用。

- 获取服务对象的描述信息，描述中包含service的`名字`，`方法数量`以及`方法的抽象描述`，将这些信息封装到map表中，用于处理服务和方法的寻找

    ```cpp
    const google::protobuf::ServiceDescriptor* pserviceDesc = service->GetDescriptor();
    std::string service_name = pserviceDesc->name();//service名字
    int methodCnt = pserviceDesc->method_count();//service方法数量
    const google::protobuf::MethodDescriptor* pmethonDest = pserviceDesc->method(i);//方法的抽象描述
    std::string method_name = pmethonDest->name();//方法的名字
    ```

#### 1.3、启动RPC服务

现在存在一个问题，那就是通过RPC实现的分布式框架会很多RPC服务提供者，调用方是如何知道每一个服务的调用地址呢，总不能列一个静态配置文件，一个一个的罗列出来吧，这样维护成本太高了，每次添加或删除一个service服务，调用方都要修改配置文件并重新启动。服务方的进行修改时还需要修改调用方，这样的设计实在太糟糕了。

为了解决上述问题，`zookeeper`就出现了，根据观察者模式的思想，**每一个提供方在启动时都在zookeeper中注册信息**，调用方的所有调用，只需要发送给zookeeper，**至于调用方的地址在哪，调用方都无需关心，一切都由zookeeper负责**。这样，调用方就只需要关注zookeeper地址即可，服务方的修改也不会影响到调用方。

![PixPin_2025-03-31_09-28-24](https://images.guangyin.blog/2025/03/43ccd681c849c730aba235da0c914d8c.webp)

- 连接zookeeper服务

    ```cpp
    // 连接zkserver
    void ZKClient::Start()
    {
        std::string host = MprpcApplication::GetInstance().getConfig().Load("zookeeperip");
        std::string port = MprpcApplication::GetInstance().getConfig().Load("zookeeperport");
        std::string connstr = host + ":" + port;
    
        m_zhandle = zookeeper_init(connstr.c_str(), global_watcher, 30000, nullptr, nullptr, 0);
        if (nullptr == m_zhandle)
        {
            perror("zookeeper_init");
            exit(EXIT_FAILURE);
        }
    
        sem_t sem;
        sem_init(&sem, 0, 0);
        zoo_set_context(m_zhandle, &sem);
    
        // 阻塞等待global_watcher函数被调用，在ZooKeeper连接成功建立解除阻塞
        sem_wait(&sem);
    }
    ```

- 往zookeeper中注册服务

    ```cpp
    // 注册服务
    for(auto &sp : m_serviceMap)
    {
        std::string service_path = "/" + sp.first;
        // 0表示永久性节点
        zkclient.Create(service_path.c_str(), nullptr, 0);
        for(auto &mp : sp.second.m_methodMap)
        {
            std::string method_path = service_path + "/" + mp.first;
            char method_path_buffer[128] = {0};
            snprintf(method_path_buffer, sizeof(method_path_buffer), "%s:%d",ip.c_str(), port);
            // ZOO_EPHEMERAL 表示创建临时节点
            zkclient.Create(method_path.c_str(), method_path_buffer, strlen(method_path_buffer),ZOO_EPHEMERAL);
        }
    }
    ```

- 最后，启动网络服务完成最后的RPC启动工作

    ```cpp
    server.start();
    m_eventLoop.loop();
    ```

### 二、RPC提供者实现细节

前面提到，protoc会为每个service生成对应的C++类，包含虚函数，用户需要继承并实现这些函数。

首先我们可以看见，FriendServiceRpc是protoc给我们自动生成的service类，我们可以看到它继承了`google ::protobuf::Service`

- 我们可以先看看**google ::protobuf::Service**的实现，我们可以看见，这是一个抽象类

```cpp
class PROTOBUF_EXPORT Service {
 public:
  inline Service() {}
  virtual ~Service();

  enum ChannelOwnership { STUB_OWNS_CHANNEL, STUB_DOESNT_OWN_CHANNEL };

  // Get the ServiceDescriptor describing this service and its methods.
  virtual const ServiceDescriptor* GetDescriptor() = 0;

  //可以看见，CallMethod是一个纯虚函数，FriendServiceRpc类重写service中的这个函数，通过service多态调用FriendServiceRpc的		CallMethod方法
  virtual void CallMethod(const MethodDescriptor* method,
                          RpcController* controller, const Message* request,
                          Message* response, Closure* done) = 0;

  virtual const Message& GetRequestPrototype(
      const MethodDescriptor* method) const = 0;
  virtual const Message& GetResponsePrototype(
      const MethodDescriptor* method) const = 0;

 private:
  GOOGLE_DISALLOW_EVIL_CONSTRUCTORS(Service);
};
```

- protobuf生成的服务类`FriendServiceRpc`，这个类通过继承**google ::protobuf::Service**并重写CallMethod方法调用我们重写的函数`GetFriendList`

```cpp
class FriendServiceRpc : public ::PROTOBUF_NAMESPACE_ID::Service {
 protected:
  // This class should be treated as an abstract interface.
  inline FriendServiceRpc() {};
 public:
  virtual ~FriendServiceRpc();

  typedef FriendServiceRpc_Stub Stub;

  //service描述
  static const ::PROTOBUF_NAMESPACE_ID::ServiceDescriptor* descriptor();

  //方法名的抽象描述，我们需要重写这个方法
  virtual void GetFriendList(::PROTOBUF_NAMESPACE_ID::RpcController* controller,
                       const ::friendservice::GetFriendListRequest* request,
                       ::friendservice::GetFriendListResponse* response,
                       ::google::protobuf::Closure* done);

  // implements Service ----------------------------------------------

  const ::PROTOBUF_NAMESPACE_ID::ServiceDescriptor* GetDescriptor();
  //CallMethod是最关键的函数，service通过多态调用这个CallMethod方法，而这个方法会调用我们重写好的函数！
  void CallMethod(const ::PROTOBUF_NAMESPACE_ID::MethodDescriptor* method,
                  ::PROTOBUF_NAMESPACE_ID::RpcController* controller,
                  const ::PROTOBUF_NAMESPACE_ID::Message* request,
                  ::PROTOBUF_NAMESPACE_ID::Message* response,
                  ::google::protobuf::Closure* done);
  const ::PROTOBUF_NAMESPACE_ID::Message& GetRequestPrototype(
    const ::PROTOBUF_NAMESPACE_ID::MethodDescriptor* method) const;
  const ::PROTOBUF_NAMESPACE_ID::Message& GetResponsePrototype(
    const ::PROTOBUF_NAMESPACE_ID::MethodDescriptor* method) const;

 private:
  GOOGLE_DISALLOW_EVIL_CONSTRUCTORS(FriendServiceRpc);
};

//调用方法的处理逻辑，protobuf为每一个方法都生成了一个下标，在请求到来时，会通过下标确定方法并通过多态的方式调用
void UserServiceRpc::CallMethod(const ::PROTOBUF_NAMESPACE_ID::MethodDescriptor* method,
                             ::PROTOBUF_NAMESPACE_ID::RpcController* controller,
                             const ::PROTOBUF_NAMESPACE_ID::Message* request,
                             ::PROTOBUF_NAMESPACE_ID::Message* response,
                             ::google::protobuf::Closure* done) {
  GOOGLE_DCHECK_EQ(method->service(), file_level_service_descriptors_user_2eproto[0]);
  switch(method->index()) {
    case 0:
      Login(controller,
             ::PROTOBUF_NAMESPACE_ID::internal::DownCast<const ::fixbug::LoginRequest*>(
                 request),
             ::PROTOBUF_NAMESPACE_ID::internal::DownCast<::fixbug::LoginResponse*>(
                 response),
             done);
      break;
    case 1:
      Register(controller,
             ::PROTOBUF_NAMESPACE_ID::internal::DownCast<const ::fixbug::RegisterRequest*>(
                 request),
             ::PROTOBUF_NAMESPACE_ID::internal::DownCast<::fixbug::RegisterResponse*>(
                 response),
             done);
      break;
    default:
      GOOGLE_LOG(FATAL) << "Bad method index; this should never happen.";
      break;
  }
}
```

- 我们自定义的服务类，用于继承并重写FriendServiceRpc中的虚函数

```cpp
class FriendService : public friendservice::FriendServiceRpc
{
public:
    static std::vector<std::string> getFriendList(uint32_t userid)
    {
        std::cout << "doing local service： getFriendList , userid : " << userid << std::endl;
        std::vector<std::string> friendList;
        friendList.emplace_back("zhangsan");
        friendList.emplace_back("lisi");
        friendList.emplace_back("wangwu");
        return friendList;
    }

    void GetFriendList(::google::protobuf::RpcController* controller,
                       const ::friendservice::GetFriendListRequest* request,
                       ::friendservice::GetFriendListResponse* response,
                       ::google::protobuf::Closure* done) override
    {
        uint32_t userid = request->userid();
        std::vector<std::string> friendList = getFriendList(userid);
        response->mutable_result()->set_errcode(0);
        response->mutable_result()->set_errmsg("");
        for (const std::string& name : friendList)
        {
            response->add_friends(name);
        }
        done->Run();
    }
};
```

​	从上面我们可以大致看出，RPC服务提供者处理就是在服务端请求到达时，首先会将父类指针**google::protobuf::Service***指向子类对象，这个子类对象实际上就是上面的`class FriendService : public friendservice::FriendServiceRpc`，也就是我们自己实现的类，再通过`FriendService`的CallMethod方法（由于没有重写，实际上是父类的CallMethod方法）调用我们重写的方法，至于怎么确定是哪个函数，这个由protobuf内部负责的，具体逻辑就是我们们看见的`FriendServiceRpc`重写的CallMethod方法，这个CallMethod会调用我们重写好的函数。

![image-20250331145019803](https://images.guangyin.blog/2025/03/55504beee760fab7a3122e82ea00ed8d.webp)

实际上，protobuf知道我们要调用哪个函数，是需要我们传递一些参数的，我们可以看到CallMethod的函数声明

```cpp
  virtual void CallMethod(const MethodDescriptor* method,
                          RpcController* controller, const Message* request,
                          Message* response, Closure* done) = 0;
```

1. method：就是对应调用方法的描述，`const google::protobuf::MethodDescriptor* method`,通过这个描述，FriendServiceRpc就能知道要调用哪个方法。
2. controller：通过这个RpcController类，我们可以查询返回数据时是否发生错误，并获得相关的RPC的信息，如错误的信息。
3. request：包含方法的参数信息
4. response: 包含服务提供者返回的响应消息
5. done: 用于发送数据给客户端

```cpp
//request
google::protobuf::Message* request = service->GetRequestPrototype(method).New();
//response
google::protobuf::Message* response = service->GetResponsePrototype(method).New();
//done，在done调用run方法时，会调用sendRpcResponse方法
google::protobuf::Closure* done = google::protobuf::
    NewCallback<RpcProvider, const muduo::net::TcpConnectionPtr&, google::protobuf::Message*>(
    this, &RpcProvider::sendRpcResponse, conn, response);
```

首先，我们首先要根据protobuf的数据格式约定，提取出调用方的调用信息

```cpp
//解析服务描述信息
if (rpcHeader.ParseFromString(rpc_header_str))
{
    service_name = rpcHeader.service_name();
    method_name = rpcHeader.method_name();
    args_size = rpcHeader.args_size();
}
```

然后查看服务和方法是否存在

```cpp
auto it = m_serviceMap.find(service_name);
if (it == m_serviceMap.end())
{
    LOG_ERROR("service_name : %s is not found", service_name.c_str());
    return;
}
// 尝试确认是否提供对应的方法
auto mit = it->second.m_methodMap.find(method_name);
if (mit == it->second.m_methodMap.end())
{
    LOG_ERROR("service_name : %s method_name : %s is not found",
              service_name.c_str(),
              method_name.c_str());
    return;
}
```

初始化request的参数数据

```cpp
google::protobuf::Message* request = service->GetRequestPrototype(method).New();
if (!request->ParseFromString(args_str))
{
    LOG_ERROR("request parse error,content : %s", args_str.c_str());
    return;
}
```

最后调用CallMethod方法

```cpp
service->CallMethod(method, nullptr, request, response, done);
```

具体代码实现：

```cpp
void RpcProvider::onMessage(const muduo::net::TcpConnectionPtr& conn,
                            muduo::net::Buffer* buffer,
                            muduo::Timestamp timer)
{
    std::string recv_buf = buffer->retrieveAllAsString();
    // 从字符流中读取前4个字节的内容
    uint32_t header_size = 0;
    // 从第0个字节开始读取，读取4个字节
    recv_buf.copy((char*)&header_size, 4, 0);
    std::cout << header_size << std::endl;
    // 根据header_size读取数据头的原始字符流,从第五个字节开始读取数据
    std::string rpc_header_str = recv_buf.substr(4, header_size);
    mprpc::RpcHeader rpcHeader;
    std::string service_name;
    std::string method_name;
    uint32_t args_size;
    if (rpcHeader.ParseFromString(rpc_header_str))
    {
        service_name = rpcHeader.service_name();
        method_name = rpcHeader.method_name();
        args_size = rpcHeader.args_size();
        LOG_INFO("service_name : %s, method_name : %s, args_size : %d",
                 service_name.c_str(),
                 method_name.c_str(),
                 args_size);
    }
    else
    {
        LOG_ERROR("rpc_header_str : %s parse error", rpc_header_str.c_str());
    }
    // 参数 args_size处理粘包问题
    std::string args_str = recv_buf.substr(4 + header_size, args_size);

    // 尝试确认是否提供对应的服务
    auto it = m_serviceMap.find(service_name);
    if (it == m_serviceMap.end())
    {
        LOG_ERROR("service_name : %s is not found", service_name.c_str());
        return;
    }
    // 尝试确认是否提供对应的方法
    auto mit = it->second.m_methodMap.find(method_name);
    if (mit == it->second.m_methodMap.end())
    {
        LOG_ERROR("service_name : %s method_name : %s is not found",
                  service_name.c_str(),
                  method_name.c_str());
        return;
    }
    google::protobuf::Service* service = it->second.m_service; // 指向service对象，也就是我们自己实现的类
    const google::protobuf::MethodDescriptor* method = mit->second; // 指向对应的method对象，具体要调用的函数

    // 生成rpc方法调用的请求request和响应response对象
    google::protobuf::Message* request = service->GetRequestPrototype(method).New();

    //解析参数数据
    if (!request->ParseFromString(args_str))
    {
        LOG_ERROR("request parse error,content : %s", args_str.c_str());
        return;
    }
    LOG_INFO("args_str : %s", request->DebugString().c_str());
    google::protobuf::Message* response = service->GetResponsePrototype(method).New();

    google::protobuf::Closure* done = google::protobuf::
        NewCallback<RpcProvider, const muduo::net::TcpConnectionPtr&, google::protobuf::Message*>(
            this, &RpcProvider::sendRpcResponse, conn, response);

    service->CallMethod(method, nullptr, request, response, done);
}

void RpcProvider::sendRpcResponse(const muduo::net::TcpConnectionPtr& conn,
                                  google::protobuf::Message* response)
{
    std::string response_str;
    if (response->SerializeToString(&response_str))
    {
        // 序列化成功后发送给调用方
        conn->send(response_str);
    }
    else
    {
        LOG_ERROR("Serialize response_str error !");
    }
    conn->shutdown(); // 模拟http的短链接服务，有rpcprovider主动断开连接
}
```

### 三、调用方配置

使用姿势

```cpp
// 初始化框架
MprpcApplication::Init(argc, argv);
//初始化RpcChannel
friendservice::FriendServiceRpc_Stub stub(new MprpcChannel());
friendservice::GetFriendListRequest getFriendListRequest;
// 定义请求参数
getFriendListRequest.set_userid(1);
friendservice::GetFriendListResponse getFriendListResponse;
MprpcController controller;
//stub.GetFriendList的第四个参数传入nullptr表示阻塞等待结果，也可以传入一个回调函数（Closure）,
//异步等待结果，当rpc调用完成后会调用这个回调函数
stub.GetFriendList(&controller, &getFriendListRequest, &getFriendListResponse, nullptr);

if (!controller.Failed())
{
    if (0 == getFriendListResponse.result().errcode())
    {
        //成功时的处理逻辑
    }
    else
    {
        //失败时的错误逻辑
    }
}
else
{
    std::cout << "rpc error : " << controller.ErrorText() << std::endl;
}

```

### 四、RPC调用者实现细节

protobuf不就会生成服务提供者相关的类，同样还会实现调用者相关的类

与提供者不同的是，调用的创建的父类对象是继承自`FriendServiceRpc`，也就是提供者的那个父类，每一个服务提供者的类都会生成一个对应的`Stub`类，调用方通过这个Stub类就能与提供方实现数据间相互处理。

```cpp
class FriendServiceRpc_Stub : public FriendServiceRpc {
 public:
  FriendServiceRpc_Stub(::PROTOBUF_NAMESPACE_ID::RpcChannel* channel);
  FriendServiceRpc_Stub(::PROTOBUF_NAMESPACE_ID::RpcChannel* channel,
                   ::PROTOBUF_NAMESPACE_ID::Service::ChannelOwnership ownership);
  ~FriendServiceRpc_Stub();

  inline ::PROTOBUF_NAMESPACE_ID::RpcChannel* channel() { return channel_; }

  // implements FriendServiceRpc ------------------------------------------

  void GetFriendList(::PROTOBUF_NAMESPACE_ID::RpcController* controller,
                       const ::friendservice::GetFriendListRequest* request,
                       ::friendservice::GetFriendListResponse* response,
                       ::google::protobuf::Closure* done);
 private:
  ::PROTOBUF_NAMESPACE_ID::RpcChannel* channel_;
  bool owns_channel_;
  GOOGLE_DISALLOW_EVIL_CONSTRUCTORS(FriendServiceRpc_Stub);
};
```

实际上，`FriendServiceRpc_Stub` 类并没有直接实现 `CallMethod` 方法，而是通过一个更精妙的设计来实现 RPC 调用。当我们查看 `FriendServiceRpc_Stub` 的构造函数时，可以发现它需要一个 `RpcChannel` 对象作为参数。这个 `RpcChannel` 类才是真正包含 `CallMethod` 方法的地方。这样表示着，**调用方的所有操作，最终都会通过经过这个`RpcChannel`类并通过其`CallMethod`方法发出。** 而 `RpcChannel` 本身是一个抽象类，只定义了这一个纯虚方法，这正是 Protocol Buffers 框架的精髓所在 - 它提供了接口定义，但将具体的网络通信实现留给了开发者。通过继承 `RpcChannel` 并重写其 `CallMethod` 方法，我们可以实现序列化和反序列化逻辑，添加额外的元数据（如超时设置、重试策略等）等。

```cpp
class PROTOBUF_EXPORT RpcChannel {
 public:
  inline RpcChannel() {}
  virtual ~RpcChannel();

  virtual void CallMethod(const MethodDescriptor* method,
                          RpcController* controller, const Message* request,
                          Message* response, Closure* done) = 0;

 private:
  GOOGLE_DISALLOW_EVIL_CONSTRUCTORS(RpcChannel);
};
```

具体的执行过程如下：

- 客户端通过Stub类调用对应的RPC接口，在这个接口中调用RpcChannel的CallMethod方法

```cpp
stub.GetFriendList(&controller, &getFriendListRequest, &getFriendListResponse, nullptr);
//调用CallMethod方法，protobuf生成对应描述，使用下标调用对应的方法
void FriendServiceRpc_Stub::GetFriendList(::PROTOBUF_NAMESPACE_ID::RpcController* controller,
                              const ::friendservice::GetFriendListRequest* request,
                              ::friendservice::GetFriendListResponse* response,
                              ::google::protobuf::Closure* done) {
  channel_->CallMethod(descriptor()->method(0),
                       controller, request, response, done);
}
```

- RpcChannel的CallMethod方法实际上调用的是我们重写的方法，用于封装并发送的数据

```cpp
class MprpcChannel : public google::protobuf::RpcChannel
{
public:
    MprpcChannel();
    ~MprpcChannel();

    // 所以使用stub代理对象调用rpc方法的都会调用callMethod方法，通过该方法进行数据的序列化和网络发送
    void CallMethod(const google::protobuf::MethodDescriptor* method,
                    google::protobuf::RpcController* controller,
                    const google::protobuf::Message* request,
                    google::protobuf::Message* response,
                    google::protobuf::Closure* done) override;

private:
};

void MprpcChannel::CallMethod(const google::protobuf::MethodDescriptor* method,
                              google::protobuf::RpcController* controller,
                              const google::protobuf::Message* request,
                              google::protobuf::Message* response,
                              google::protobuf::Closure* done)
{
    // 通过method从ServiceDescriptor中获取服务名字
    const google::protobuf::ServiceDescriptor* sd = method->service();
    const std::string& service_name = sd->name();
    const std::string& method_name = method->name();

    std::string args_str;
    uint32_t args_size = 0;
    // 序列化请求参数
    if (request->SerializeToString(&args_str))
    {
        args_size = args_str.size();
    }
    else
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] serialize request error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("serialize request error");
        return;
    }

    // 组织rpc请求头,包含服务名、方法名、参数长度
    mprpc::RpcHeader rpcHeader;
    rpcHeader.set_service_name(service_name);
    rpcHeader.set_method_name(method_name);
    rpcHeader.set_args_size(args_size);

    // 计算rpc请求头的长度
    uint32_t header_size = 0;
    std::string rpc_header_str;
    if (rpcHeader.SerializeToString(&rpc_header_str))
    {
        header_size = rpc_header_str.size();
    }
    else
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] serialize rpc header error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("serialize rpc header error");
        return;
    }

    // 组织待发送的rpc请求，rpc请求 = 请求头 + 请求体(参数)
    std::string send_rpc_str;
    // 将header_size转为二进制格式，存放在send_rpc_str的开始处的前四个字节
    send_rpc_str.insert(0, std::string((char*)&header_size, 4));
    send_rpc_str += rpc_header_str; // rpc请求头
    send_rpc_str += args_str;       // rpc请求体(参数)

    int clientfd = socket(AF_INET, SOCK_STREAM, 0);
    if (-1 == clientfd)
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] create socket error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("create socket error");
        return;
    }
    ZKClient zkClient;
    zkClient.Start();
    // 从zookeeper中获取服务提供者的ip和端口
    std::string service_path = "/" + service_name + "/" + method_name;
    std::string host_data = zkClient.GetData(service_path.c_str());
    if (host_data.empty())
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] get host error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("get host error");
        return;
    }
    int idx = host_data.find(":");
    if (idx == -1)
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] host format error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("host format error");
        return;
    }
    std::string ip = host_data.substr(0, idx);
    uint16_t port = atoi(host_data.substr(idx + 1, host_data.size() - idx).c_str());
    std::cout << "ip : " << ip << " port : " << port << std::endl;
    sockaddr_in server_addr{};
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = inet_addr(ip.c_str());
    server_addr.sin_port = htons(port);
	// 与服务提供者建立连接
    if (-1 == connect(clientfd, (sockaddr*)&server_addr, sizeof(server_addr)))
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] connect error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("connect error");
        close(clientfd);
        return;
    }
    //发送调用请求
    if (-1 == send(clientfd, send_rpc_str.c_str(), send_rpc_str.size(), 0))
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] send error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("send error");
        close(clientfd);
        return;
    }

    // 这里使用阻塞等待接收数据
    char recv_buf[1024];
    int recv_size = 0;
    if (-1 == (recv_size = recv(clientfd, recv_buf, 1024, 0)))
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] recv error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("recv error");
        close(clientfd);
        return;
    }

    //解析服务端返回的数据
    if (response->ParseFromArray(recv_buf, recv_size))
    {
        std::cout << "response parse successful" << std::endl;
    }
    else
    {
        char errmsg[128] = {0};
        snprintf(errmsg,
                 127,
                 "service[%s] method[%s] parse response error",
                 service_name.c_str(),
                 method_name.c_str());
        controller->SetFailed("parse response error");
    }
    close(clientfd);
}
```

总体来说，调用方只需要继承RpcChannel并重写其CallMethod方法，调用方只需要提供对应的参数，调用的方法就能，就能通过CallMethod方法实现自动处理发送并处理RPC请求与响应，其余交给框架处理。
