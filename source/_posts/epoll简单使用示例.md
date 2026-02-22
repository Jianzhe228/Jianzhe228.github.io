title: epoll简单使用示例
date: 2025-03-28 13:28:00
categories: 搞七捻三
tags: [C++,epoll]
---
```cpp
#include <cerrno>
#include <cstdlib>
#include <sys/epoll.h>
#include <unistd.h>
#include <sys/socket.h>
#include <cstdio>
#include <fcntl.h>
#include <netinet/in.h>
#include <csignal>
#include <cstring>

int main()
{
    //创建监听套接字
    int listenfd = socket(AF_INET,SOCK_STREAM,0);
    if(listenfd == -1)
    {
        perror("socket");
        exit(EXIT_FAILURE);
    }
    //设置端口复用
    int opt = 1;
    if(setsockopt(listenfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt))==-1)
    {
        perror("setsockopt");
        close(listenfd);
        return EXIT_FAILURE;
    }
    //将监听套接字设置为非阻塞
    int flag = fcntl(listenfd,F_GETFL,0);
    if (flag == -1) {
        perror("fcntl F_GETFL");
        close(listenfd);
        return EXIT_FAILURE;
    }
    if (fcntl(listenfd, F_SETFL, flag | O_NONBLOCK) == -1) {
        perror("fcntl F_SETFL");
        close(listenfd);
        return EXIT_FAILURE;
    }
    //绑定端口
    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = htonl(INADDR_ANY);
    serverAddr.sin_port = htons(12332);

    if (bind(listenfd, reinterpret_cast<sockaddr*>(&serverAddr), sizeof(serverAddr)) == -1) {
        perror("bind");
        close(listenfd);
        return EXIT_FAILURE;
    }

    //开始监听
    if (listen(listenfd, SOMAXCONN) == -1) {
        perror("listen");
        close(listenfd);
        return EXIT_FAILURE;
    }

    //创建epoll实例
    int epollfd = epoll_create1(0);
    if(epollfd == -1)
    {
        perror("epoll_create");
        return EXIT_FAILURE;
    }
    //将监听描述服放到epoll树上
    epoll_event event;
    event.events = EPOLLIN|EPOLLET;
    event.data.fd = listenfd;
    if (epoll_ctl(epollfd, EPOLL_CTL_ADD, listenfd, &event) == -1) {
        perror("epoll_ctl listenfd");
        close(listenfd);
        close(epollfd);
        return EXIT_FAILURE;
    }
    //创建事件数组
    epoll_event events[1024];
    int count = 0;
    while(true)
    {
        count = epoll_wait(epollfd,events,1024,-1);
        for(int i = 0; i < count; ++i)
        {
            if(events[i].data.fd == listenfd)
            {
                //建立连接
                sockaddr_in clientAddr{};
                socklen_t clientsize = sizeof(clientAddr);
                int clientfd = accept(listenfd,reinterpret_cast<sockaddr*>(&clientAddr),&clientsize);
                if (clientfd == -1) {
                    if (errno == EAGAIN || errno == EWOULDBLOCK) break;
                    perror("accept");
                    continue;
                }
                //将客户端的文件描述服设置为非阻塞
                int clientFlags = fcntl(clientfd, F_GETFL,0);
                if (clientFlags == -1) {
                    perror("fcntl F_GETFL");
                    close(listenfd);
                    continue;
                }
                if (fcntl(clientfd, F_SETFL, clientFlags | O_NONBLOCK) == -1) {
                    perror("fcntl client");
                    close(clientfd);
                    continue;
                }
                //将监听描述服上树
                epoll_event clientEvent{};
                clientEvent.events = EPOLLIN|EPOLLET|EPOLLRDHUP;
                clientEvent.data.fd = clientfd;
                if (epoll_ctl(epollfd, EPOLL_CTL_ADD, clientfd, &clientEvent) == -1) {
                    perror("epoll_ctl client");
                    close(clientfd);
                }
            }
            else{
                int clientfd = events[i].data.fd;
                //EPOLLERR 和 EPOLLHUP 事件如果发生，总是会被报告，无论这些事件是否在 events 中被指定
                if(events[i].events & (EPOLLRDHUP | EPOLLHUP | EPOLLERR)) {
                    printf("Client %d disconnected abnormally\n", clientfd);
                    epoll_ctl(epollfd, EPOLL_CTL_DEL, clientfd, nullptr);
                    close(clientfd);
                    continue;
                }
                // 循环读取全部数据（边缘触发模式必须）
                while(1) {
                    char buffer[1024];
                    ssize_t num_bytes = recv(clientfd, buffer, sizeof(buffer), 0);
                    
                    if(num_bytes > 0) {
                        buffer[num_bytes] = '\0';
                        printf("Received %zd bytes from client %d: %s\n", 
                            num_bytes, clientfd, buffer);
                    }
                    else if(num_bytes == 0) {
                        printf("Connection closed by client: %d\n", clientfd);
                        epoll_ctl(epollfd, EPOLL_CTL_DEL, clientfd, nullptr);
                        close(clientfd);
                        break;
                    }
                    else {  // num_bytes == -1
                        if(errno == EAGAIN || errno == EWOULDBLOCK) {
                            // 数据读取完毕
                            printf("EAGAIN/EWOULDBLOCK encountered for client %d - no more data to read\n", clientfd);
                            break;
                        }
                        perror("recv");
                        epoll_ctl(epollfd, EPOLL_CTL_DEL, clientfd, nullptr);
                        close(clientfd);
                        break;
                    }
                }
            }
        }
    }
    close(listenfd);
    close(epollfd);
    return 0;
}
```

测试：

方式1：

```cpp
nc localhost 12332
```

方式2：

```cpp
telnet localhost 12332
```

