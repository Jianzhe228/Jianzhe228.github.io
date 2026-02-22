title: CTP API 开发流程
date: 2025-08-14 08:14:00
categories: 开发调优
tags: [CTP]
---
API和文档下载：https://www.simnow.com.cn/static/apiDownload.action

![image-20250814152725311](https://images.228610.xyz/2025/08/0ac5abec79c0b4930fc02854f56d0b6b.png)

将动态库继承到cmake时有点坑，simnow的动态库没有前缀lib,需要自行添加，否则cmake链接不到

```cmake
FIND_PACKAGE(ZLIB REQUIRED)
LINK_DIRECTORIES(${PROJECT_SOURCE_DIR}/lib)

TARGET_LINK_LIBRARIES(${PROJECT_NAME} 
    ${PROJECT_SOURCE_DIR}/lib/libthostmduserapi_se.so
    ${ZLIB_LIBRARIES} 
    ${PROJECT_SOURCE_DIR}/lib/libstdc++.so.6 
    pthread)
```

### API 命名规则

| 消息           | 格式           | 示例                |
| -------------- | -------------- | ------------------- |
| 请求           | Req------      | ReqUserLogin        |
| 响应           | OnRsp------    | OnRspUserLogin      |
| 查询           | ReqQry------   | ReqQryInstrument    |
| 查询请求的响应 | OnRspQry------ | OnRspQryInstrument  |
| 回报           | OnRtn------    | OnRtnOrder          |
| 错误回报       | OnErrRtn------ | OnErrRtnOrderInsert |



### 交互流程

CTP程序的Api请求，都会在Spi回调线程中处理

![image-20250814154623940](https://images.228610.xyz/2025/08/f84209f0842e5f83fccde14469e4aa90.png)

### CTP通用参数

1.  **nRequestID**：客户端发送请求时要为该请求指定一个请求编号。**交易接口会在响应或回报中返回与该请求相同**
    **的请求编号**。当客户端进行频繁操作时，很有可能会造成同一个响应函数被调用多次，这种情况下，能将请
    求与响应关联起来的纽带就是请求编号。

2. **IsLast**： 当响应函数需要携带的数据包过大时，该数据包会被分割成数个小的数据包并按顺序逐次发送，这种
    情况下同一个响应函数就是被调用多次，而**参数 IsLast 就是用于描述当前收到的响应数据包是不是所有数据**
    **包中的最后一个**。

    >   例如在查询持仓时，如果查询结果为多条记录，则会分多次回调返回，此时除了最后一次 IsLast 为 true 外，其余全
    >   为 false。`

3.  **RspInfo** 该参数用于描述请求执行过程中是否出现错误。该数据结构中的属性 ErrorId 如果是 0，则说明该请

    求被交易核心认可通过。否则，该参数描述了交易核心返回的错误信息。

4.  **error.xml** 文件中包含所有可能的错误信息。



### Api

首先需要创建一个 `CThostFtdcMdApi* api_`对象，一般习惯于将其再封装一层CMdApi

```cpp
class CTraderApi
{
private:
    CThostFtdcTraderApi* api_ = nullptr;
    int generate_request_id();

public:
    CTraderApi();
    ~CTraderApi();
    CThostFtdcTraderApi* CreateFtdcTraderApi(const char* pszFlowPath = "");
	virtual void RegisterSpi(CThostFtdcTraderSpi* pSpi); 
    virtual void RegisterFront();
    
    //下面两个订阅函数仅在交易接口需要配置，在行情接口中不需要
    virtual void SubscribePrivateTopic();
    virtual void SubscribePublicTopic();
    
    virtual void Init();
    virtual int ReqAuthenticate();
    virtual int ReqUserLogin();
    
    virtual int Join();
    virtual void Release();
};
```

为了使投资者及时准确的了解自己的交易状况，如可用资金，持仓，保证金占用等，从而及时了解自己的风险状况，综合交易平台要求投资者在每一个交易日进行交易前都必须对前一交易日的结算结果进行确认。交易接口需要调用下面的确认函数。

```
api->ReqSettlementInfoConfirm();
```



### Spi

Spi需要先继承行情接口类 CThostFtdcMdSpi，并实现需要实现的虚函数。

```
class CTraderSpi : public CThostFtdcTraderSpi
{
private:
    CThostFtdcTraderApi* api_ = nullptr;

public:
    explicit CTraderSpi(CThostFtdcTraderApi*);
    ~CTraderSpi();

    virtual void OnFrontConnected();
    virtual void OnFrontDisconnected(int nReason);
 	virtual void OnRspAuthenticate(CThostFtdcRspAuthenticateField* pRspAuthenticateField,
                                   CThostFtdcRspInfoField* pRspInfo,
                                   int nRequestID,
                                   bool bIsLast);
    virtual void OnRspUserLogin(CThostFtdcRspUserLoginField* pRspUserLogin,
                                CThostFtdcRspInfoField* pRspInfo,
                                int nRequestID,
                                bool bIsLast);
    virtual void OnRspError(CThostFtdcRspInfoField* pRspInfo, int nRequestID, bool bIsLast);
};
```



### 踩坑

1.注意，Release函数会销毁对象，最后如果调用Join函数会导致段错误

<img src="https://images.228610.xyz/2025/08/d2209d1a2b6ed8b62451cdd99255dae0.png" alt="image-20250814161653234" style="zoom:80%;" /> 

<img src="https://images.228610.xyz/2025/08/1beda6746bdc33326d53e79286b65c44.png" alt="image-20250814161804541" style="zoom: 50%;" /> 



2、回调线程不要有耗时的操作，使用生产者和消费者处理任务

3、不要在回调线程发送请求操作，可能会造成意料之外的事情
