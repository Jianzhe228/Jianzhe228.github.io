title: MySQL优化
date: 2025-03-30 09:10:00
categories: 数据库
tags: [MySQL]
---
MySQL需要优化的地方有哪些？

1. SQL和索引优化
2. 应用上的优化
3. MySQL server优化

### 一、SQL和索引优化

1. 慢查询日志：开启 MySQL 的慢查询日志，捕捉执行时间较长的 SQL 语句。

2. **`EXPLAIN` 语句**：对于发现的慢查询，使用 `EXPLAIN` 分析查询的执行计划，查看查询是否利用了索引，是否有全表扫描等问题。

### 二、应用上优化

1. 连接数据库方面：引入线程池，减少创建连接次数
2. 引入缓存: 使用redis缓存热点数据

### 三、MySQL Server优化

#### 1、配置上的优化

**`SHOW STATUS` ,`SHOW VARIABLES`和`show engine innodb status\G`**：检查数据库的状态和配置项，查看是否存在如锁争用、资源使用不当等问题。

**`innodb_buffer_pool_size`**：确保 InnoDB 的 Buffer Pool 足够大,一般设置为系统内存的 60%-80%。这能缓存更多的数据页，减少磁盘 I/O 操作，尤其是当查询和修改的数据量较大时。

```sql
SET GLOBAL innodb_buffer_pool_size = 4G;  -- 设置为4GB
```

**`innodb_log_buffer_size`**：确保日志缓冲区足够大，避免事务日志在写入时的等待。对于高事务量的系统，可以将其设置为更大的值。

```sql
SET GLOBAL innodb_log_buffer_size = 128M;  -- 设置为128MB
```

**`innodb_flush_log_at_trx_commit`**：为了提高性能，可以考虑将其设置为 `2`，减少每次事务提交时的磁盘同步，但这会增加崩溃恢复的风险。

```sql
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
```

并发连接数量和超时时间设置，MySQL Server作为一个服务器，可以设置客户端的最大连接量和连接超时时间，如果数据库连接统计数量比较大，这两个参数的值需要设置大一些。在配置文件（my.cnf或my.ini）最下面，添加配置：max_connections=2000，然后重启MySQLServer，设置生效

```sql
mysql> show global variables like '%timeout%';
+-----------------------------------+----------+
| Variable_name                     | Value    |
+-----------------------------------+----------+
| connect_timeout                   | 10       |
| delayed_insert_timeout            | 300      |
| have_statement_timeout            | YES      |
| innodb_flush_log_at_timeout       | 1        |
| innodb_lock_wait_timeout          | 50       |
| innodb_rollback_on_timeout        | OFF      |
| interactive_timeout               | 28800    |
| lock_wait_timeout                 | 31536000 |
| mysqlx_connect_timeout            | 30       |
| mysqlx_idle_worker_thread_timeout | 60       |
| mysqlx_interactive_timeout        | 28800    |
| mysqlx_port_open_timeout          | 0        |
| mysqlx_read_timeout               | 30       |
| mysqlx_wait_timeout               | 28800    |
| mysqlx_write_timeout              | 60       |
| net_read_timeout                  | 30       |
| net_write_timeout                 | 60       |
| replica_net_timeout               | 60       |
| rpl_stop_replica_timeout          | 31536000 |
| rpl_stop_slave_timeout            | 31536000 |
| slave_net_timeout                 | 60       |
| ssl_session_cache_timeout         | 300      |
| wait_timeout                      | 28800    |
+-----------------------------------+----------+
23 rows in set (0.06 sec)

mysql> show variables like '%connect%';
+-----------------------------------------------+----------------------+
| Variable_name                                 | Value                |
+-----------------------------------------------+----------------------+
| character_set_connection                      | utf8mb4              |
| collation_connection                          | utf8mb4_0900_ai_ci   |
| connect_timeout                               | 10                   |
| connection_memory_chunk_size                  | 8192                 |
| connection_memory_limit                       | 18446744073709551615 |
| disconnect_on_expired_password                | ON                   |
| global_connection_memory_limit                | 18446744073709551615 |
| global_connection_memory_tracking             | OFF                  |
| init_connect                                  |                      |
| max_connect_errors                            | 100                  |
| max_connections                               | 151                  |
| max_user_connections                          | 0                    |
| mysqlx_connect_timeout                        | 30                   |
| mysqlx_max_connections                        | 100                  |
| performance_schema_session_connect_attrs_size | 512                  |
+-----------------------------------------------+----------------------+
15 rows in set (0.11 sec)
```
