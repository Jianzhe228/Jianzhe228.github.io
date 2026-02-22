title: MySQL-日志
date: 2025-03-30 09:04:00
categories: 数据库
tags: [MySQL]
---
1. 错误日志：mysqld服务运行错误过程中出现的cordump error exception

2. 查询日志:记录所有的sql，包括增删改查，一般在调试的时候开启

    ```cpp
    mysql> show global variables like "%genera%";
    ```

3. 二进制日志：数据恢复，主从复制。除select外

4. 慢查询日志

### 相关日志

查看服务打开状态

```sql
mysql> show variables like 'log_%';
+----------------------------------------+----------------------------------------+
| Variable_name                          | Value                                  |
+----------------------------------------+----------------------------------------+
| log_bin                                | ON                                     |
| log_bin_basename                       | /var/lib/mysql/binlog                  |
| log_bin_index                          | /var/lib/mysql/binlog.index            |
| log_bin_trust_function_creators        | OFF                                    |
| log_bin_use_v1_row_events              | OFF                                    |
| log_error                              | /var/log/mysql/error.log               |
| log_error_services                     | log_filter_internal; log_sink_internal |
| log_error_suppression_list             |                                        |
| log_error_verbosity                    | 2                                      |
| log_output                             | FILE                                   |
| log_queries_not_using_indexes          | OFF                                    |
| log_raw                                | OFF                                    |
| log_replica_updates                    | ON                                     |
| log_slave_updates                      | ON                                     |
| log_slow_admin_statements              | OFF                                    |
| log_slow_extra                         | OFF                                    |
| log_slow_replica_statements            | OFF                                    |
| log_slow_slave_statements              | OFF                                    |
| log_statements_unsafe_for_binlog       | ON                                     |
| log_throttle_queries_not_using_indexes | 0                                      |
| log_timestamps                         | UTC                                    |
+----------------------------------------+----------------------------------------+
21 rows in set (0.21 sec)
```

打开my.ini或my.cnf,在后面加上上面的参数，保存后重启mysql服务就行了

```sql
#Enter a name for the error log file. Otherwise a default name will be used.
log-error=err.log
#Enter a name for the query log file. Otherwise a default name will be used.
#log=
#Enter a name for the slow query log file. Otherwise a default name will be
used.
#log-slow-queries=
#Enter a name for the update log file. Otherwise a default name will be used.
#log-update=
#Enter a name for the binary log. Otherwise a default name will be used.
#log-bin=
```

在linux root下重启mysqld服务：service mysqld restart



### 二进制日志

二进制日志(BINLOG)记录了所有的 DDL(数据定义语言)语句和 DML(数据操纵语言) 语句，但是不包括数据查询语句。语句以“事件”的形式保存，它描述了数据的更改过程。 此日志对于灾难时的数据恢复起着极其重要的作用。

#### **1、启用和配置二进制日志**

要启用 binlog，需要在 MySQL 配置文件 `my.cnf`（或 `my.ini`）中添加以下配置：

```ini
[mysqld]
log-bin=mysql-bin
```

- **log-bin**：指定二进制日志文件的前缀名（例如 `mysql-bin`）。MySQL 会创建一系列带编号的文件，如 `mysql-bin.000001`。
- **server-id**：在启用复制时，必须为每个 MySQL 实例设置唯一的 server-id。
- **expire_logs_days**：设置 binlog 文件的过期时间（以天为单位）。如设置为 `7`，那么超过 7 天的 binlog 会被自动删除。

#### 2、**二进制日志格式**

MySQL 提供了三种 binlog 格式：

- **STATEMENT**（语句模式）：记录 SQL 语句的执行，主服务器记录执行的 SQL 语句，从服务器重复执行这些 SQL 语句来保持同步。可能存在“SQL 语句不一致”的问题，尤其是有非确定性查询时。
- **ROW**（行模式）：记录每一行数据的具体变化（例如哪个字段被修改、修改成了什么值）。该模式最为精确，能够保证主从一致性，但日志文件的体积较大。
- **MIXED**（混合模式）：结合了 STATEMENT 和 ROW 模式。对于确定性语句（如没有副作用的 `INSERT`），使用 STATEMENT 模式；对于可能不一致的语句，则使用 ROW 模式。

可以在 MySQL 配置文件中设置 binlog 格式：

```ini
[mysqld]
binlog_format = ROW
```



#### 3、查看二进制日志文件

```sql
show binary logs;
show master logs;
```

```sql
mysql> show master logs;
+---------------+-----------+-----------+
| Log_name      | File_size | Encrypted |
+---------------+-----------+-----------+
| binlog.000021 |       157 | No        |
| binlog.000022 |       157 | No        |
| binlog.000023 |       157 | No        |
| binlog.000024 |       201 | No        |
| binlog.000025 |       157 | No        |
| binlog.000026 |       157 | No        |
| binlog.000027 |     24566 | No        |
| binlog.000028 |      2991 | No        |
| binlog.000029 |      6672 | No        |
| binlog.000030 |       180 | No        |
| binlog.000031 |       180 | No        |
| binlog.000032 |      2028 | No        |
| binlog.000033 |       854 | No        |
| binlog.000034 |      2992 | No        |
| binlog.000035 | 104857809 | No        |
| binlog.000036 | 104857839 | No        |
| binlog.000037 | 104858229 | No        |
| binlog.000038 | 104858037 | No        |
| binlog.000039 | 104858047 | No        |
| binlog.000040 | 104858047 | No        |
| binlog.000041 | 104858057 | No        |
| binlog.000042 | 104858061 | No        |
| binlog.000043 | 104858277 | No        |
| binlog.000044 | 104858121 | No        |
| binlog.000045 | 104857801 | No        |
| binlog.000046 | 104857801 | No        |
| binlog.000047 |  82853815 | No        |
| binlog.000048 |      5534 | No        |
| binlog.000049 |       157 | No        |
| binlog.000050 |       504 | No        |
| binlog.000051 |       180 | No        |
| binlog.000052 |       180 | No        |
| binlog.000053 |       826 | No        |
| binlog.000054 |       201 | No        |
| binlog.000055 |       157 | No        |
| binlog.000056 |      1791 | No        |
| binlog.000057 |       201 | No        |
| binlog.000058 |       157 | No        |
| binlog.000059 |       971 | No        |
| binlog.000060 |       201 | No        |
| binlog.000061 |      2140 | No        |
| binlog.000062 |       201 | No        |
| binlog.000063 |       157 | No        |
| binlog.000064 |       551 | No        |
| binlog.000065 |       157 | No        |
| binlog.000066 |       599 | No        |
| binlog.000067 |       157 | No        |
| binlog.000068 |       157 | No        |
| binlog.000069 |       157 | No        |
| binlog.000070 |       201 | No        |
| binlog.000071 |       460 | No        |
| binlog.000072 |       157 | No        |
| binlog.000073 |       201 | No        |
| binlog.000074 |       157 | No        |
| binlog.000075 |       157 | No        |
| binlog.000076 |       201 | No        |
| binlog.000077 |       157 | No        |
| binlog.000078 |       201 | No        |
| binlog.000079 |       201 | No        |
| binlog.000080 |       157 | No        |
+---------------+-----------+-----------+
60 rows in set (0.01 sec)
```

通过mysqlbinlog工具（mysql原生自带的工具）可以快速解析大量的binlog日志文件

```cpp
shell> mysqlbinlog mysql-bin.000001
```

![PixPin_2024-12-04_17-20-31](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-04_17-20-31.png) ![PixPin_2024-12-04_17-21-01](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-04_17-21-01.png)

- 可以看见，图片下面有个建表语句

    ```sql
    create table user(
        id int unsigned primary key Auto_increment comment "id",
        nikename varchar(50) unique not null comment "昵称",
        age tinyint unsigned not null default 18,
        sex enum('male','female')
    )
    ```

- 上面还有个at 810,810表示position,我们可以指定从哪个position开始恢复数据和结束数据

- at 810下面是时间，我们同样可以指定时间开始恢复数据

#### 4、数据恢复

```cpp
shell> mysqlbinlog --no-defaults --database=school --base64-output=decode-rows -v --start-datetime='2021-05-01 00:00:00' --stop-datetime='2021-05-10 00:00:00' mysql-bin.000001 | more
    
shell> mysqlbinlog --start-position=775 --stop-position=1410 mysql-bin.000003 |mysql -u root -p
```

例如：

```sql
# at 612
#241204 17:46:14 server id 1  end_log_pos 726 CRC32 0x274047b7  Query   thread_id=15    exec_time=0     error_code=0    Xid = 63
SET TIMESTAMP=1733305574/*!*/;
/*!80016 SET @@session.default_table_encryption=0*//*!*/;
create database testcc
/*!*/;
# at 726
#241204 17:46:56 server id 1  end_log_pos 803 CRC32 0xa2f57962  Anonymous_GTID  last_committed=3        sequence_number=4       rbr_only=no     original_committed_timestamp=1733305617157030       immediate_commit_timestamp=1733305617157030     transaction_length=204
# original_commit_timestamp=1733305617157030 (2024-12-04 17:46:57.157030 CST)
# immediate_commit_timestamp=1733305617157030 (2024-12-04 17:46:57.157030 CST)
/*!80001 SET @@session.original_commit_timestamp=1733305617157030*//*!*/;
/*!80014 SET @@session.original_server_version=80040*//*!*/;
/*!80014 SET @@session.immediate_server_version=80040*//*!*/;
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
# at 803
#241204 17:46:56 server id 1  end_log_pos 930 CRC32 0x07dd25eb  Query   thread_id=15    exec_time=1     error_code=0    Xid = 68
use `testcc`/*!*/;
SET TIMESTAMP=1733305616/*!*/;
/*!80013 SET @@session.sql_require_primary_key=0*//*!*/;
create table user(name varchar(20))
/*!*/;
# at 930
#241204 17:47:17 server id 1  end_log_pos 1009 CRC32 0x57b8a615         Anonymous_GTID  last_committed=4        sequence_number=5       rbr_only=yesoriginal_committed_timestamp=1733305637724198   immediate_commit_timestamp=1733305637724198     transaction_length=294
/*!50718 SET TRANSACTION ISOLATION LEVEL READ COMMITTED*//*!*/;
# original_commit_timestamp=1733305637724198 (2024-12-04 17:47:17.724198 CST)
# immediate_commit_timestamp=1733305637724198 (2024-12-04 17:47:17.724198 CST)
/*!80001 SET @@session.original_commit_timestamp=1733305637724198*//*!*/;
/*!80014 SET @@session.original_server_version=80040*//*!*/;
/*!80014 SET @@session.immediate_server_version=80040*//*!*/;
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
# at 1009
#241204 17:47:17 server id 1  end_log_pos 1086 CRC32 0xafff30b0         Query   thread_id=15    exec_time=0     error_code=0
SET TIMESTAMP=1733305637/*!*/;
BEGIN
/*!*/;
# at 1086
#241204 17:47:17 server id 1  end_log_pos 1142 CRC32 0xb84eb2b4         Table_map: `testcc`.`user` mapped to number 97
# has_generated_invisible_primary_key=0
# at 1142
#241204 17:47:17 server id 1  end_log_pos 1193 CRC32 0x9bd9ee20         Write_rows: table id 97 flags: STMT_END_F

BINLOG '
JSVQZxMBAAAAOAAAAHYEAAAAAGEAAAAAAAEABnRlc3RjYwAEdXNlcgABDwJQAAECA/z/ALSyTrg=
JSVQZx4BAAAAMwAAAKkEAAAAAGEAAAAAAAEAAgAB/wAIemhhbmdzYW4ABGxpc2kg7tmb
'/*!*/;
# at 1193
#241204 17:47:17 server id 1  end_log_pos 1224 CRC32 0x7ffbc10c         Xid = 69
COMMIT/*!*/;
# at 1224
#241204 17:48:41 server id 1  end_log_pos 1301 CRC32 0x055f777d         Anonymous_GTID  last_committed=5        sequence_number=6       rbr_only=nooriginal_committed_timestamp=1733305721708032    immediate_commit_timestamp=1733305721708032     transaction_length=187
# original_commit_timestamp=1733305721708032 (2024-12-04 17:48:41.708032 CST)
# immediate_commit_timestamp=1733305721708032 (2024-12-04 17:48:41.708032 CST)
/*!80001 SET @@session.original_commit_timestamp=1733305721708032*//*!*/;
/*!80014 SET @@session.original_server_version=80040*//*!*/;
/*!80014 SET @@session.immediate_server_version=80040*//*!*/;
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
# at 1301
#241204 17:48:41 server id 1  end_log_pos 1411 CRC32 0x7d2caeb7         Query   thread_id=15    exec_time=0     error_code=0    Xid = 73
SET TIMESTAMP=1733305721/*!*/;
drop database testcc
/*!*/;
SET @@SESSION.GTID_NEXT= 'AUTOMATIC' /* added by mysqlbinlog */ /*!*/;
DELIMITER ;
# End of log file
/*!50003 SET COMPLETION_TYPE=@OLD_COMPLETION_TYPE*/;
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=0*/;
```

我创建了一个testcc数据库，然后删除，我需要恢复这个数据库

```bash
root@zjz-VMware-Virtual-Platform:~# mysqlbinlog --start-position=612 --stop-position=1301 /var/lib/mysql/binlog.000080 | mysql -u root -p
Enter password:
```

#### 5、数据备份

使用mysql自带的mysqldump工具导出数据

```sql
root@zjz-VMware-Virtual-Platform:~# mysqldump
Usage: mysqldump [OPTIONS] database [tables]
OR     mysqldump [OPTIONS] --databases [OPTIONS] DB1 [DB2 DB3...]
OR     mysqldump [OPTIONS] --all-databases [OPTIONS]
For more options, use mysqldump --help
root@zjz-VMware-Virtual-Platform:~#
```

备份testcc的user表

```bash
mysqldump -u root -p testcc user > ~/user.sql
```

```bash
root@zjz-VMware-Virtual-Platform:~# mysqldump -u root -p testcc user > ~/user.sql
Enter password:
root@zjz-VMware-Virtual-Platform:~# ls
snap  user.sql
root@zjz-VMware-Virtual-Platform:~# cat user.sql
-- MySQL dump 10.13  Distrib 8.0.40, for Linux (x86_64)
--
-- Host: localhost    Database: testcc
-- ------------------------------------------------------
-- Server version       8.0.40-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `name` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('zhangsan'),('lisi');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-04 17:55:54
root@zjz-VMware-Virtual-Platform:~#
```

还有常用的导出：

```cpp
mysql -u root -p -D school -e "select *from user where age>18" > ~/user.txt
```

![PixPin_2024-12-04_18-14-47](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-12-04_18-14-47.png) 

#### 6、导入数据

加载数据,假设在zjz用户下有一份sql数据

```cpp
zjz@zjz-VMware-Virtual-Platform:~$ cat user.sql
-- MySQL dump 10.13  Distrib 8.0.40, for Linux (x86_64)
--
-- Host: localhost    Database: testcc
-- ------------------------------------------------------
-- Server version       8.0.40-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `user`
--
create database testcc;
use testcc;

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `name` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('zhangsan'),('lisi');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-04 17:55:54
zjz@zjz-VMware-Virtual-Platform:~$
```

导入

```cpp
mysql> SOURCE /home/zjz/user.sql;
Query OK, 0 rows affected (0.01 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 1 row affected (0.04 sec)

Database changed
Query OK, 0 rows affected (0.01 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.08 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.01 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 2 rows affected (0.01 sec)
Records: 2  Duplicates: 0  Warnings: 0

Query OK, 0 rows affected (0.01 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

mysql> SHOW DATABASES;
+--------------------+
| Database           |
+--------------------+
| chat               |
| information_schema |
| mysql              |
| performance_schema |
| school             |
| sys                |
| test               |
| testcc             |
+--------------------+
8 rows in set (0.00 sec)

mysql>
```

