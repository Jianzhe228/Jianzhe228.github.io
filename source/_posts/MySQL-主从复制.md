title: MySQL-主从复制
date: 2025-03-30 09:18:00
categories: 数据库
tags: [MySQL]
---
![PixPin_2024-12-04_21-02-44](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-04_21-02-44.png)主从复制：两个日志（`binlog`二进制日志，relay log日志）和三个线程（`master`一个线程和`slave`两个线程)主库对外提高增删改查服务，从库根据二进制日志将数据同步到从库.

### 一、主从复制流程：两个日志（binlog/relay log）和三个线程（主库的转储线程和从库的IO线程与sql线程）

1. 主库的更新操作写入binlog二进制日志中

2. master服务器创建一个binlog转储线程（`binlog dump process`），将二进制日志内容发送到从服务器。可以通过`show processlist;`查看线程信息

3. slave机器执行START SLAVE命令会在从服务器创建一个IO线程，接收master的`binary log`并复制到其`relay log`中继日志。

    

4. `sql slave thread`（sql从线程）处理该过程的最后一步，sql线程从中继日志中读取事件，并重放其中的事件而更新slave机器的数据，使其与master主库的数据一致。只要该线程与I/O线程保持一致，中继日志通常会位于os缓存中，所以中继日志的开销很小。

> 从数据库生成两个线程，一个是IO线程，用于将binlog日志写到relay log中，同时还会创建一个sql线程，用于读取relay log中的命令并重放到从数据库中，执行写操作，insert,update，delete等操作

### 二、**主从复制作用**：

1. **数据备份**：即使主库挂了，也可以通过mycat将请求映射到从库，继续对外服务
    - **热备份**：
        - 通过主从复制，主库的数据会实时同步到从库，从库作为实时的备份库（热备份）可以随时切换。
        - 如果主库发生故障，可以快速将从库提升为主库，继续提供服务，最大程度减少数据丢失和服务中断。
    - **容灾**：
        - 在数据中心宕机或硬件故障的情况下，从库位于不同物理位置（例如异地机房），可用作容灾库，保证业务连续性。
    - **高可用**：
        - 配合负载均衡工具（如 MyCat、HAProxy、Keepalived），当主库不可用时，可以自动切换到从库，提高系统的可用性。
2. **读写分离**
    - **操作由主库处理**：
        - 主库负责处理事务性较强、需要严格一致性的写操作（如 `INSERT`、`UPDATE`、`DELETE` 等）。
        - 写操作完成后，主库通过二进制日志（binlog）将更改同步到从库。
    - **读操作由从库处理**：
        - 从库负责处理只读操作（如 `SELECT` 查询）。
        - 一个主库可以有多个从库（常见为 1 主多从架构），将大量的读请求分摊到多个从库中，减少主库的负载，提高整体读写效率。
    - **优点**：
        - **提高性能**：减少主库压力，通过多个从库分担读取任务，支持更多并发读请求。
        - **优化资源**：主库的写性能和从库的读性能可以分别优化，避免资源浪费。



### 三、主从复制的局限性与优化

1. **限制**
    1. **数据延迟**：
        - 主库的写操作通过 binlog 异步传输到从库，可能会有微小的同步延迟（尤其在网络较差或从库负载较高时）。
        - 对于强一致性要求高的业务，需要额外设计机制。
    2. **从库只读**：
        - 在默认配置下，从库是只读的。如果在从库上进行写操作，可能导致数据不一致。
    3. **主库压力过大**：
        - 在写操作较多的情况下，主库压力仍然较大，可能需要结合分库分表进一步优化。

2. **优化**

    - **半同步复制**：

        - 从库在接收到 binlog 并写入中继日志后，才向主库确认，减少数据延迟和丢失的风险。

        - **双主模式（主主复制）**：
            - 两个主库相互同步，一方故障时另一方可以无缝接管，增强容灾能力。

    - **分布式数据库**：
        - 配合分库分表和分布式数据库中间件（如 ShardingSphere、MyCat），实现更高效的负载均衡和扩展性。

**总结**

1. **数据备份**：
   - 主从复制实现了实时的数据同步，提供热备份、容灾和高可用能力。
   - 在主库故障时，从库可以接管服务，保证系统的持续运行。
2. **读写分离**：
   - 主库负责写操作，从库负责读操作，合理分摊压力。
   - 通过增加从库数量，可以线性扩展读性能，支持高并发场景。



### 四、配置主从复制


linux为主库，windows为从库

条件：

master和slave机器的信息

- master（Ubuntu 24）：192.168.135.129
- slave : 10.157.219.148

需要保证master和slave之间的网络互通，并且保证3306端口是开放的

1. **主库配置：**

    - Ubuntu 24 打开3306端口

    ```bash
    #允许所有请求
    sudo ufw allow 3306
    #只允许指定IP的请求
    sudo ufw allow from <IP地址> to any port 3306
    ```

    - Ubuntu24 打开二进制日志,修改/etc/mysql/my.cnf文件

    ```ini
    [mysqld]
    server-id=1#用于区分从库
    expire_logs_days=7#二进制日志保存时间
    log-bin=mysql-bin #开启二进制日志
    binlog-do-db=mytest #指定同步的库名，如果不填写，默认是全局
    ```

    - 创建用于主从库通信的账号,只允许从库服务器登录

    ```sql
    CREATE USER 'mslave'@'192.168.135.1' IDENTIFIED BY '123456';
    GRANT REPLICATION SLAVE ON *.* TO 'mslave'@'192.168.135.1';
    FLUSH PRIVILEGES;
    ```

     这里没有填写windows的地址是因为Ubuntu24是运行在windows的虚拟机上面，使用的是NAT网络模式（如果使用桥接模式就没什么问题，直接写windows的地址），NAT模式会创建一个虚拟网卡，windows在与虚拟机中的linux服务器进行通信时，首先会将数据发送到192.168.135.1这个网关上，然后再转发到虚拟机中的linux服务器,所以虚拟机中的linux服务器接收来自windows的消息实际上全部都是从192.168.135.1这个网关转发过来的。所以这里填写192.168.135.1才能通过。
    
     ![PixPin_2024-12-04_22-11-49](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-04_22-11-49.png) 

    - 获取主库binlog的日志文件名和position位置

    ```sql
    mysql> show master status;
    +------------------+----------+--------------+------------------+-------------------+
    | File             | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set |
    +------------------+----------+--------------+------------------+-------------------+
    | mysql-bin.000001 |      1533|              |                  |                   |
    +------------------+----------+--------------+------------------+-------------------+
    1 row in set (0.00 sec)
    
    mysql>
    ```

2. 从库配置

    - 修改配置文件，"C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"

        ```ini
        [mysqld]
        server-id=2
        relay-log=relay-bin
        log_bin=slave-bin
        ```

        然后在任务管理器中的服务中重启MySQL服务
        ![PixPin_2024-12-04_22-34-06](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-04_22-34-06.png)

- 登录mysql创建账户读取binlog同步数据，执行如下语句

    ```cpp
    CHANGE MASTER TO MASTER_HOST='192.168.135.129',
    MASTER_PORT=3306,
    MASTER_USER='mslave',
    MASTER_PASSWORD='123456',
    MASTER_LOG_FILE='mysql-bin.000001',
    MASTER_LOG_POS=1533;
    ```

- 开启从库服务

    ```cpp
    start slave;
    ```

    查看服务状态

    ```sql
    mysql> show slave status\G
    *************************** 1. row ***************************
                   Slave_IO_State: Connecting to source
                      Master_Host: 192.168.135.129
                      Master_User: mslave
                      Master_Port: 3306
                    Connect_Retry: 60
                  Master_Log_File: mysql-bin.000001
              Read_Master_Log_Pos: 885
                   Relay_Log_File: zjz-relay-bin.000001
                    Relay_Log_Pos: 4
            Relay_Master_Log_File: mysql-bin.000001
                 Slave_IO_Running: Connecting
                Slave_SQL_Running: Yes
                  Replicate_Do_DB:
              Replicate_Ignore_DB:
               Replicate_Do_Table:
           Replicate_Ignore_Table:
          Replicate_Wild_Do_Table:
      Replicate_Wild_Ignore_Table:
                       Last_Errno: 0
                       Last_Error:
                     Skip_Counter: 0
              Exec_Master_Log_Pos: 885
                  Relay_Log_Space: 157
                  Until_Condition: None
                   Until_Log_File:
                    Until_Log_Pos: 0
               Master_SSL_Allowed: No
               Master_SSL_CA_File:
               Master_SSL_CA_Path:
                  Master_SSL_Cert:
                Master_SSL_Cipher:
                   Master_SSL_Key:
            Seconds_Behind_Master: NULL
    Master_SSL_Verify_Server_Cert: No
                    Last_IO_Errno: 2061
                    Last_IO_Error: Error connecting to source 'mslave@192.168.135.129:3306'. This was attempt 1/86400, with a delay of 60 seconds between attempts. Message: Authentication plugin 'caching_sha2_password' reported error: Authentication requires secure connection.
                   Last_SQL_Errno: 0
                   Last_SQL_Error:
      Replicate_Ignore_Server_Ids:
                 Master_Server_Id: 0
                      Master_UUID:
                 Master_Info_File: mysql.slave_master_info
                        SQL_Delay: 0
              SQL_Remaining_Delay: NULL
          Slave_SQL_Running_State: Replica has read all relay log; waiting for more updates
               Master_Retry_Count: 86400
                      Master_Bind:
          Last_IO_Error_Timestamp: 241204 22:40:21
         Last_SQL_Error_Timestamp:
                   Master_SSL_Crl:
               Master_SSL_Crlpath:
               Retrieved_Gtid_Set:
                Executed_Gtid_Set:
                    Auto_Position: 0
             Replicate_Rewrite_DB:
                     Channel_Name:
               Master_TLS_Version:
           Master_public_key_path:
            Get_master_public_key: 0
                Network_Namespace:
    1 row in set, 1 warning (0.00 sec)
    
    mysql>
    ```

    ```sql
    mysql> show processlist;
    +----+-----------------+-----------------+------+---------+------+----------------------------------------------------------+------------------+
    | Id | User            | Host            | db   | Command | Time | State                                                    | Info             |
    +----+-----------------+-----------------+------+---------+------+----------------------------------------------------------+------------------+
    |  5 | event_scheduler | localhost       | NULL | Daemon  |  510 | Waiting on empty queue                                   | NULL             |
    |  8 | root            | localhost:8068  | NULL | Query   |    0 | init                                                     | show processlist |
    |  9 | system user     | connecting host | NULL | Connect |  175 | Connecting to source                                     | NULL             |
    | 10 | system user     |                 | NULL | Query   |  175 | Replica has read all relay log; waiting for more updates | NULL             |
    | 11 | system user     |                 | NULL | Connect |  175 | Waiting for an event from Coordinator                    | NULL             |
    | 12 | system user     |                 | NULL | Connect |  175 | Waiting for an event from Coordinator                    | NULL             |
    | 13 | system user     |                 | NULL | Connect |  175 | Waiting for an event from Coordinator                    | NULL             |
    | 14 | system user     |                 | NULL | Connect |  175 | Waiting for an event from Coordinator                    | NULL             |
    +----+-----------------+-----------------+------+---------+------+----------------------------------------------------------+------------------+
    8 rows in set, 1 warning (0.00 sec)
    
    mysql>
    ```

    

错误排查：

1. 问题1：

    ```sql
    Last_IO_Errno: 2061
    Last_IO_Error: Error connecting to source 'mslave@192.168.135.129:3306'. This was attempt 1/86400, with a delay of 60 seconds between attempts. Message: Authentication plugin 'caching_sha2_password' reported error: Authentication requires secure connection.
    ```

    问题的原因是 MySQL 8.0 默认使用 `caching_sha2_password` 作为认证插件，而从库在连接主库时未启用 SSL 或使用了不支持 `caching_sha2_password` 的连接方式。

    解决方案：

    1. 方法 1：修改用户的认证插件为 `mysql_native_password`

        -  **在主库修改用户认证插件**： 登录主库，执行以下命令：

            ```cpp
            ALTER USER 'mslave'@'192.168.135.1' IDENTIFIED WITH 'mysql_native_password' BY '123456';
            FLUSH PRIVILEGES;
            ```

            - 这会将用户 `mslave` 的密码认证插件从 `caching_sha2_password` 改为 `mysql_native_password`。

            - `mysql_native_password` 不要求使用 SSL 连接，可以解决当前问题。

        - **重启从库同步**： 在从库执行以下命令：

            ```sql
            STOP SLAVE;
            START SLAVE;
            ```

        - **验证同步状态**： 查看同步状态，确认是否正常：

            ```cpp
            SHOW SLAVE STATUS\G;
            ```

    2. 方法二：启用 SSL 连接（推荐），但没试过，使用方法一已经成功了

        如果你希望继续使用 `caching_sha2_password`，则需要在主从之间启用 SSL 安全连接。

        1. **在主库启用 SSL 支持**： 编辑主库的配置文件（`my.cnf`）：

            ```ini
            [mysqld]
            ssl-ca=/path/to/ca-cert.pem
            ssl-cert=/path/to/server-cert.pem
            ssl-key=/path/to/server-key.pem
            ```

            重启主库服务：

            ```bash
            sudo systemctl restart mysql
            ```

        2. **在从库启用 SSL 支持**： 确保从库也配置了 SSL 并指定主库的证书。可以在 `CHANGE MASTER TO` 命令中添加 SSL 参数：

            ```sql
            CHANGE MASTER TO
                MASTER_HOST='192.168.135.129',
                MASTER_USER='mslave',
                MASTER_PASSWORD='123456',
                MASTER_LOG_FILE='mysql-bin.000001',
                MASTER_LOG_POS=120,
                MASTER_SSL=1,
                MASTER_SSL_CA='/path/to/ca-cert.pem',
                MASTER_SSL_CERT='/path/to/client-cert.pem',
                MASTER_SSL_KEY='/path/to/client-key.pem';
            ```

            **重启从库同步**：

            ```sql
            START SLAVE;
            ```

            

排查技巧：

 1. 在进行主从复制前，确保要同步的数据库，表名，表结构，数据库等在从库一定要实现创建！且必须要一模一样！否则可能会如下报错

     ```cpp
     Coordinator stopped because there were error(s) in the worker(s). The most recent failure being: Worker 1 failed executing transaction 'ANONYMOUS' at source log mysql-bin.000003, end_log_pos 2682. See error log and/or performance_schema.replication_applier_status_by_worker table for more details about this failure or others, if any.
     ```

     经过排查发现，错误可能是从库中的表没创建，字符集不一致，varchar大小不够，类型不一致等问题导致的！事务出现错误

     `查看错误日志!`这点很重要！在这里可以详细看见错误的信息

     ```sql
      select * from performance_schema.replication_applier_status_by_worker\G
     ```

     ```cpp
     Worker 1 failed executing transaction 'ANONYMOUS' at source log mysql-bin.000003, end_log_pos 2974; Column 0 of table 'mytest.test' cannot be converted from type 'varchar(400(bytes))' to type 'varchar(300(bytes) utf8mb3)'
      
     Worker 1 failed executing transaction 'ANONYMOUS' at source log mysql-bin.000003, end_log_pos 2682; Error executing row event: 'Table 'mytest.test' doesn't exist'
     ```

     例如上面第一个错误就是字符集和长度不一致导致的，从库使用了utf8mb3,主库使用了utf8mb4; 第二个错误就是从库的表没有创建！在开始主从复制前，我们需要配置与主库相同的库表环境！可以导出主库的二进制日志文件sql，确保环境一致！

 2. 网络相关

     ![PixPin_2024-12-04_23-40-19](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-04_23-40-19.png) 

     1. 网络能否ping通
     2. 主库所在机器的3306端口是否正常 telnet xxxx 3306测试
     3. 查看主库的错误日志
     4. 查看地址等是否正确，是使用NAT网络还是桥接网络？NAT使用网关，桥接使用IP
