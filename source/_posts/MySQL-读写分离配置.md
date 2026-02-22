title: MySQL-读写分离配置
date: 2025-03-30 09:17:00
categories: 数据库
tags: [MySQL]
---
读写分离就是在主服务器上修改，数据会同步到从服务器，从服务器只能提供读取数据，不能写入，实现备份的同时也实现了数据库性能的优化，以及提升了服务器安全。 

![PixPin_2024-12-05_10-41-32](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-05_10-41-32.png) 

使用读写分离，一般需要配合代理中间件MyCat，客户端将要执行的sql发送到MyCat，MyCat会根据sql的类型发送到不同的服务器上，如果是写操作，则发送到主服务器上，如果是读操作，则发送到从服务器上，已解决强耦合问题。

读写分离需要配合主从复制，以同步主从服务器的数据。	

MyCat服务器：

1. 一主一从
2. 一主多从
3. 多主多从
    - 多主多从就是包含多个独立的主从环境，假如有A，B两套环境，A环境如上图所示,A 环境的一主多从结构独立于 B 环境，B环境也是如此，同时，A 环境的主服务器与 B 环境的主服务器之间配置为主从关系，假设A为主服务器，那么操作A时会将数据同步到B环境的主服务器，已达到数据同步的效果，当 A 环境出现故障时，B 环境可以迅速接替工作，提供高可用性和容灾能力。



### 一、读写分离配置

环境：

1. JDK环境：MyCat由java开发，需要JDK环境

    ```bash
    java -version
    ```

    查看环境，一般按照linux时已经自带了

2. 查看root用户能否远程连接

    ```sql
    use mysql;
    select user,host from user;
    ```

    ```sql
    mysql> use mysql;
    Reading table information for completion of table and column names
    You can turn off this feature to get a quicker startup with -A
    
    Database changed
    mysql> select user,host from user;
    +------------------+---------------+
    | user             | host          |
    +------------------+---------------+
    | root             | %             |
    | zhangsan         | %             |
    | mslave           | 192.168.135.1 |
    | debian-sys-maint | localhost     |
    | mysql.infoschema | localhost     |
    | mysql.session    | localhost     |
    | mysql.sys        | localhost     |
    | root             | localhost     |
    +------------------+---------------+
    8 rows in set (0.00 sec)
    
    mysql>
    ```

    添加root用户远程访问：

    ```sql
    CREATE USER 'root'@'ip_address' IDENTIFIED BY 'some_pass';
    GRANT ALL PRIVILEGES ON *.* TO 'root'@'ip_address';
    FLUSH PRIVILEGES;
    ```

    ip_address可以填写MyCat地址，也可以时MyCat地址

3. 安装[mycat](https://github.com/MyCATApache/Mycat-download/tree/master/1.6-RELEASE)
    客户端默认端口：8066, 管理端端口：9066

    ```bash
    tar -zxvf xxx.tar.gz
    ```

    添加一个软连接到/usr/bin目录下,需要root权限

    ```bash
    ln -s /home/zjz/Downloads/mycat/bin/mycat /usr/bin/mycat
    ```

    配置：

    1. `server.xml`配置MyCat账号信息，用于登录,

        ```xml
        <user name="root">
            <property name="password">123456</property>
            <property name="schemas">TESTDB</property>
        
            <!-- 表级 DML 权限设置 -->
            <!-- 		
          <privileges check="false">
           <schema name="TESTDB" dml="0110" >
            <table name="tb01" dml="0000"></table>
            <table name="tb02" dml="1111"></table>
           </schema>
          </privileges>		
           -->
        </user>
        ```

        - password:登录密码，可自定义
        - scemas:逻辑库，指定一个用户只能访问某些逻辑库，而不是 MyCat 中的所有库。配合 MyCat 的权限控制机制，可以为不同用户分配不同的库访问权限。 逻辑库与物理数据库的库表通过 `schema.xml` 进行映射。用户通过 MyCat 访问逻辑库时，`MyCat 会根据配置将请求路由到相应的物理库和表。`

    2. `schema.xml`配置逻辑库,这里配置的逻辑库名字要与在`server.xml`中配置的逻辑库名字一致,下面是一个`多主多从配置`

        ```xml
        <?xml version="1.0"?>
        <!DOCTYPE mycat:schema SYSTEM "schema.dtd">
        <mycat:schema xmlns:mycat="http://io.mycat/">
        	<!--配置逻辑数据库-->
        	<schema name="TESTDB" checkSQLschema="false" sqlMaxLimit="100" dataNode="dn1"></schema>
        	<!--存储节点-->
        	<dataNode name="dn1" dataHost="node1" database="mytest"/>
        	<!--数据库主机-->
        	<dataHost name="node1" maxCon="1000" minCon="10" balance="3"
        				writeType="0" dbType="mysql" dbDriver="native" switchType="1" slaveThreshold="100">
        			<heartbeat> select test()</heartbeat>
        			<!--can have multi write hosts-->
        			<writeHost host="192.168.135.129" url="192.168.135.129:3306" user="root" password="123456">
        						<readHost host="10.157.219.148" url="10.157.219.148:3306" user="root" password="123456"/>
        			</writeHost>
        			<writeHost host="10.157.219.148" url="10.157.219.148:3306" user="root" password="123456"/>
        	</dataHost>			
        </mycat:schema>
        
        ```
    
        <img src="https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-05_15-21-31.png" alt="PixPin_2024-12-05_15-21-31" style="zoom:100%;" />
    
        1. **逻辑数据库配置 (`<schema>`)**
    
            ```xml
            <schema name="TESTDB" checkSQLschema="false" sqlMaxLimit="100" dataNode="dn1"></schema>
            ```
    
            - **`name="TESTDB"`**: 定义了一个逻辑数据库，名称为 `TESTDB`，它代表一个逻辑上的数据库，可以有多个数据节点（物理数据库）参与其中。**必须要与server中的名字对应**
            - **`checkSQLschema="false"`**: 关闭了 SQL 校验功能，Mycat 不会对 SQL 语法进行验证。
            - **`sqlMaxLimit="100"`**: 定义了 SQL 查询的最大限制，最大查询结果行数为 100。
            - **`dataNode="dn1"`**: 指定了逻辑数据库 `TESTDB` 使用的数据节点 `dn1`，`dn1` 是一个物理数据节点的名称
    
        2. #### **数据节点配置 (`<dataNode>`)**
    
            ```xml
            <dataNode name="dn1" dataHost="node1" database="mytest"/>
            ```
    
            - **`name="dn1"`**: 定义了数据节点 `dn1` 的名称。数据节点是 Mycat 中物理数据库的映射。这里的名字，**必须要与schema中的dataNode相同**
            - **`dataHost="node1"`**: `dn1` 所关联的数据主机是 `node1`，数据主机是物理数据库的服务器。
            - **`database="mytest"`**: 该数据节点所使用的数据库是 `mytest`，即 Mycat 会路由到名为 `mytest` 的数据库。
    
        3.  **数据库主机配置 (`<dataHost>`)**
    
            ```xml
            <dataHost name="node1" maxCon="1000" minCon="10" balance="3" writeType="0" dbType="mysql" dbDriver="native" switchType="1" slaveThreshold="100">
                <heartbeat> select test()</heartbeat>
            ```
    
            - **`name="node1"`**: 数据主机名称是 `node1`，它代表一组物理主机，可以包含多个写主机和读主机。
    
            - **`maxCon="1000"`**: 数据库连接池的最大连接数为 1000。
    
            - **`minCon="10"`**: 数据库连接池的最小连接数为 10。
    
            - **`balance：`**
    
                - "0"：不开启读写分离
    
                - "1"：全部的readHost和stand by writeHost参与select语句的负载
    
                - "2"：所有读操作随机在readHost和writeHost上分发
    
                - "3"：所有读请求随机分发到writeHost对应的readHost上执行
    
            - **`writeType="0"`**: 所有写操作发送到配置的第一个writeHost，第一个挂掉切换到还生存的第二个writeHost
    
            - **`dbType="mysql"`**: 数据库类型是 MySQL。
    
            - **`dbDriver="native"`**: 数据库驱动类型为本地驱动（`native`）。
    
            - **`switchType="1"`**:
    
                - "-1"：不自动切换
                - "1"：自动切换，根据心跳select user()
                - "2"：基于MySQL的主从同步状态决定是否进行切换 show slave status
    
            - **`slaveThreshold="100"`**: 当主节点的负载超过 100 时，Mycat 会切换到从节点。
    
            - **心跳配置**
    
                ```sql
                <heartbeat> select test()</heartbeat>
                ```
    
                - **`heartbeat`**: 定义一个 SQL 查询，用来检测数据库连接是否活跃。这里使用了 `select test()`，目的是保持连接的活跃性。
    
        4. #### **写主机和读主机配置 (`<writeHost>` 和 `<readHost>`)**
    
            ```xml
            <writeHost host="192.168.135.129" url="192.168.135.129:3306" user="root" password="123456">
                <readHost host="10.157.219.148" url="10.157.219.148:3306" user="root" password="123456"/>
            </writeHost>
            <writeHost host="10.157.219.148" url="10.157.219.148:3306" user="root" password="123456"/>
            ```
    
            - **`writeHost`**: 配置写主机，所有的写操作将会发送到该主机。在此例中，第一个写主机是 `192.168.135.129`，第二个写主机是 `10.157.219.148`。写主机是负责处理数据库写操作的节点。
            - **`readHost`**: 配置读主机，读操作将会发送到该节点。读主机的目的是分担读取操作的负载，通常用于主从复制架构。此例中，`192.168.135.129` 的主机有一个从主机 `10.157.219.148`，它用于处理读请求。
            - 当第一和writeHost出问题时，会切换到第二个writeHost
    
    3. 启动mycat
    
        ```bash
        mycat start
        ```
    
        报错：查看logs/wrapper.log文件
    
        ```cpp
        INFO   | jvm 5    | 2024/12/05 15:47:40 | Unrecognized VM option 'MaxPermSize=64M'
        INFO   | jvm 5    | 2024/12/05 15:47:40 | Error: Could not create the Java Virtual Machine.
        INFO   | jvm 5    | 2024/12/05 15:47:40 | Error: A fatal exception has occurred. Program will exit.
        FATAL  | wrapper  | 2024/12/05 15:47:40 | There were 5 failed launches in a row, each lasting less than 300 seconds.  Giving up.
        FATAL  | wrapper  | 2024/12/05 15:47:40 |   There may be a configuration problem: please check the logs.
        STATUS | wrapper  | 2024/12/05 15:47:40 | <-- Wrapper Stopped
        ```
    
        原因时java8以后不再支持`MaxPermSize`配置，我们当前时JDK21,修改MyCat的启动配置文件wrapper.conf,注释调MaxPermSize
    
        ```bash
        # wrapper.java.additional.3=-XX:MaxPermSize=64M
        ```
    
        然后就启动成功了
    
    4. 通过查询日志验证读写分离是否成功
    
        ```sql
        show variables like 'general%';
        set global general_log=on;
        ```
    
        分别执行读写操作，对比查询日志
   可以通过一下命令登录到MyCat管理端
```bash
mysql -h xxx.xxx.xxx.xxx -p 9066 -u root -p
```
