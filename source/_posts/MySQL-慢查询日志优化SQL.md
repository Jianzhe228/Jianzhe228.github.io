title: MySQL-慢查询日志优化SQL
date: 2025-03-28 18:14:00
categories: 数据库
tags: [MySQL]
---
1. 查看慢查询日志开关是否打开

    ```sql
    mysql> show variables like 'slow_query%';
    ```

    ```sql
    mysql> show variables like 'slow_query%';
    +---------------------+-----------------------------------------------------+
    | Variable_name       | Value                                               |
    +---------------------+-----------------------------------------------------+
    | slow_query_log      | OFF                                                 |
    | slow_query_log_file | /var/lib/mysql/zjz-VMware-Virtual-Platform-slow.log |
    +---------------------+-----------------------------------------------------+
    2 rows in set (0.01 sec)
    ```
发现慢查询日志未打开

2. 打开慢查询日志

    ```sql
    set slow_query_log=ON
    ```

    ```sql
    mysql> set slow_query_log=ON
        -> ;
    ERROR 1229 (HY000): Variable 'slow_query_log' is a GLOBAL variable and should be set with SET GLOBAL
    mysql> set global slow_query_log = ON;
    Query OK, 0 rows affected (0.04 sec)
    ```

    发现报错，需要设置全局global,这个配置会影响全局，而不是仅影响此次会话

    ```sql
    set global slow_query_log = ON;
    ```

    ```sql
    mysql> set global slow_query_log = ON;
    Query OK, 0 rows affected (0.04 sec)
    
    mysql> show variables like 'slow_query%';
    +---------------------+-----------------------------------------------------+
    | Variable_name       | Value                                               |
    +---------------------+-----------------------------------------------------+
    | slow_query_log      | ON                                                  |
    | slow_query_log_file | /var/lib/mysql/zjz-VMware-Virtual-Platform-slow.log |
    +---------------------+-----------------------------------------------------+
    2 rows in set (0.01 sec)
    ```

3. 设置慢查询时间，超过该时间则记录日记

    ```sql
    mysql> show variables like 'long_query%';
    +-----------------+-----------+
    | Variable_name   | Value     |
    +-----------------+-----------+
    | long_query_time | 10.000000 |
    +-----------------+-----------+
    1 row in set (0.00 sec)
    ```

    经过查询发现，默认慢查询时间为10s,我们设置为0.1s,这个设置仅限于当前会话，对于其他会话无效

    ```sql
    mysql> set long_query_time=0.1;
    Query OK, 0 rows affected (0.00 sec)
    
    mysql> show variables like 'long_query%';
    +-----------------+----------+
    | Variable_name   | Value    |
    +-----------------+----------+
    | long_query_time | 0.100000 |
    +-----------------+----------+
    1 row in set (0.00 sec)
    ```

4. 执行sql,时间达到记录时间，记入日记

    ```sql
    mysql> select * from t_user where password = '1000000';
    +---------+-------------------+----------+
    | id      | email             | password |
    +---------+-------------------+----------+
    | 1309956 | 1000000@gmail.com | 1000000  |
    +---------+-------------------+----------+
    1 row in set (11.93 sec)
    ```

5. 使用root用户权限查看

    ```bash
    sudo -i
    cd /var/lib/mysql
    ll
    ```

    发现如下文件

    ```bash
    -rw-r-----  1 mysql mysql       433 Nov 16 17:17  zjz-VMware-Virtual-Platform-slow.log
    ```

    内容如下

    ```txt
    /usr/sbin/mysqld, Version: 8.0.40-0ubuntu0.24.04.1 ((Ubuntu)). started with:
    Tcp port: 3306  Unix socket: /var/run/mysqld/mysqld.sock
    Time                 Id Command    Argument
    # Time: 2024-11-16T09:17:17.497445Z
    # User@Host: root[root] @ localhost []  Id:     8
    # Query_time: 11.924735  Lock_time: 0.000342 Rows_sent: 1  Rows_examined: 2000000
    use school;
    SET timestamp=1731748625;
    select * from t_user where password = '1000000';
    ```

6. 使用explain分析sql，优化查询

7. 打开profiling，用于查看sql运行的具体时间，正常情况下sql的运行时间只显示两位小数，会显示0.00，我们无法查看具体时间

    ```sql
    show variables like 'profiling';
    ```

    ```sql
    mysql> show variables like 'profiling';
    +---------------+-------+
    | Variable_name | Value |
    +---------------+-------+
    | profiling     | OFF   |
    +---------------+-------+
    1 row in set (0.12 sec)
    ```

    打开profiling

    ```cpp
     set profiling= on;
    ```

    ```sql
    mysql> set profiling= on;
    Query OK, 0 rows affected, 1 warning (0.00 sec)
    ```

    运行profiling查看时间

    ```sql
    show profiles;
    ```

    ```sql
    mysql> SELECT * FROM student WHERE age < 18 OR name = 'zhangsan';
    +-----+----------+-----+-----+
    | uid | name     | age | sex |
    +-----+----------+-----+-----+
    |   1 | zhangsan |  18 | M   |
    +-----+----------+-----+-----+
    1 row in set (0.01 sec)
    
    mysql> show profiles;
    +----------+------------+-----------------------------------------------------------+
    | Query_ID | Duration   | Query                                                     |
    +----------+------------+-----------------------------------------------------------+
    |        1 | 0.00756475 | SELECT * FROM student WHERE age < 18 OR name = 'zhangsan' |
    +----------+------------+-----------------------------------------------------------+
    1 row in set, 1 warning (0.00 sec)
    
    mysql>
    ```

    
