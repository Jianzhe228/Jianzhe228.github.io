title: MySQL-limit
date: 2025-03-30 09:00:51
categories: 数据库
tags: [MySQL]
---
![Clip_2024-11-11_11-53-02](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/Clip_2024-11-11_11-53-02.png)

从图中我们可以看出，我们使用`explain`查看了sql的执行计划，由于我们将name字段设置为`unique`,所以MySQL自动为name字段设置了索引，所以只查询了一行，即rows等于1，但是，由于age没有设置索引，尽管age=13在第二行，他也是查询了全部行,即整表查询，这就导致了效率很低，如果不使用索引，那么该如何提高搜索速度呢，答案就是使用`limit`，`LIMIT` 子句限制返回的行数，减少MySQL的处理量

![Clip_2024-11-11_11-59-04](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/Clip_2024-11-11_11-59-04.png)

如图所示，limit在使用explain检查时，貌似并没有起作用，这是因为explain只是一个估算值，他并不能检查MySQL内部对sql的优化，让我们增加数据量就可以很直观的发现差异

创建测试表t_user

```sql
mysql> show create table t_user\G
*************************** 1. row ***************************
       Table: t_user
Create Table: CREATE TABLE `t_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.06 sec)

mysql>
```

```sql
#使用存储过程插入数据
DELIMITER $
CREATE PROCEDURE add_t_user(IN n INT)
BEGIN
    DECLARE i INT;
    SET i = 0;

    WHILE i < n
        DO
            INSERT INTO t_user VALUES (NULL, CONCAT(i + 1, '@gmail.com'), i + 1);
            SET i = i + 1;
        END WHILE;
END $
DELIMITER ;
CALL add_t_user(2000000)
```

测试结果如下：

```cpp
mysql> select count(*) from t_user;
+----------+
| count(*) |
+----------+
|  2000000 |
+----------+
1 row in set (0.31 sec)

mysql> select * from t_user where password = '1000000';
+---------+-------------------+----------+
| id      | email             | password |
+---------+-------------------+----------+
| 1309956 | 1000000@gmail.com | 1000000  |
+---------+-------------------+----------+
1 row in set (1.24 sec)

mysql> select * from t_user where password = '1000000' limit 1;
+---------+-------------------+----------+
| id      | email             | password |
+---------+-------------------+----------+
| 1309956 | 1000000@gmail.com | 1000000  |
+---------+-------------------+----------+
1 row in set (0.84 sec)

mysql> select * from t_user limit 1000000,10;
+---------+------------------+----------+
| id      | email            | password |
+---------+------------------+----------+
| 1000001 | 154985@gmail.com | 154985   |
| 1000002 | 845017@gmail.com | 845017   |
| 1000003 | 154986@gmail.com | 154986   |
| 1000004 | 845018@gmail.com | 845018   |
| 1000005 | 154987@gmail.com | 154987   |
| 1000006 | 845019@gmail.com | 845019   |
| 1000007 | 154988@gmail.com | 154988   |
| 1000008 | 845020@gmail.com | 845020   |
| 1000009 | 154989@gmail.com | 154989   |
| 1000010 | 845021@gmail.com | 845021   |
+---------+------------------+----------+
10 rows in set (0.56 sec)

mysql>
```

可以发现，limit的查询速度明显比普通查询速度快得多，但是我们会发现这并不稳定，因为limit偏移是需要时间的，随着数据量的增加，limit偏移所耗费的时间只越来越长，所以，我们一般的写法如下面这种,其实是有缺陷的，我们肯定是不希望limit还要遍历前面的数据，我们需要消除前面偏移的时间。

```sql
select * from t_user limit (pageno - 1) * pagenum, pagenum
```

所以，我们应该改为如下这种，当然，并不一定是id，我们使用id是因为id有索引，还可以使用其他有索引的字段

```sql
select * from t_user where id > 上一页最后一条数据的id值 limit 10; 
```

测试结果如下

```cpp
mysql> select * from t_user limit 1000000,10;
+---------+------------------+----------+
| id      | email            | password |
+---------+------------------+----------+
| 1000001 | 154985@gmail.com | 154985   |
| 1000002 | 845017@gmail.com | 845017   |
| 1000003 | 154986@gmail.com | 154986   |
| 1000004 | 845018@gmail.com | 845018   |
| 1000005 | 154987@gmail.com | 154987   |
| 1000006 | 845019@gmail.com | 845019   |
| 1000007 | 154988@gmail.com | 154988   |
| 1000008 | 845020@gmail.com | 845020   |
| 1000009 | 154989@gmail.com | 154989   |
| 1000010 | 845021@gmail.com | 845021   |
+---------+------------------+----------+
10 rows in set (0.56 sec)

mysql> select * from t_user where id > 1000000 limit 10;
+---------+------------------+----------+
| id      | email            | password |
+---------+------------------+----------+
| 1000001 | 154985@gmail.com | 154985   |
| 1000002 | 845017@gmail.com | 845017   |
| 1000003 | 154986@gmail.com | 154986   |
| 1000004 | 845018@gmail.com | 845018   |
| 1000005 | 154987@gmail.com | 154987   |
| 1000006 | 845019@gmail.com | 845019   |
| 1000007 | 154988@gmail.com | 154988   |
| 1000008 | 845020@gmail.com | 845020   |
| 1000009 | 154989@gmail.com | 154989   |
| 1000010 | 845021@gmail.com | 845021   |
+---------+------------------+----------+
10 rows in set (0.01 sec)
```

这样，我们查询的速度就很稳定了。
