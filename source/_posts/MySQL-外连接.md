title: MySQL-外连接
date: 2025-03-30 08:26:19
categories: 数据库
tags: [MySQL]
---
左右连接并不区分大小表，left join会先整表扫描左边的表，再扫描右边的表；同理right join会先扫描右边的表，再扫描左边的表；内连接的话是不确定的，会根据数据量，先扫描整表扫描小表，在扫描右表。

外连接的过滤条件放在where和on后边是不同的，中间的过滤条件应该放在on连接，确保使用的是外连接，最后的过滤应该放在where后边，对结果集进行的进一步筛选。像搜索不存在，带有一定限制条件的场景，限制条件一般加到on后边，where一般判断null即可。`这个过滤条件的位置一定要注意`

```sql
mysql> select * from student;
+-----+----------+-----+-----+
| uid | name     | age | sex |
+-----+----------+-----+-----+
|   1 | zhangsan |  18 | M   |
|   2 | gaoyang  |  20 | W   |
|   3 | chenwei  |  22 | M   |
|   4 | linfeng  |  21 | W   |
|   5 | liuxiang |  19 | W   |
|   6 | weiwie   |  20 | M   |
+-----+----------+-----+-----+
6 rows in set (0.00 sec)

mysql> select * from exams;
+-----+-----+------------+-------+
| uid | cid | time       | score |
+-----+-----+------------+-------+
|   1 |   1 | 2021-04-09 |    99 |
|   1 |   2 | 2021-04-10 |    80 |
|   2 |   2 | 2021-04-10 |    90 |
|   2 |   3 | 2021-04-12 |    85 |
|   3 |   1 | 2021-04-09 |    56 |
|   3 |   2 | 2021-04-10 |    93 |
|   3 |   3 | 2021-04-12 |    89 |
|   3 |   4 | 2021-04-11 |   100 |
|   4 |   4 | 2021-04-11 |    99 |
|   5 |   2 | 2021-04-10 |    59 |
|   5 |   3 | 2021-04-12 |    94 |
|   5 |   4 | 2021-04-11 |    95 |
+-----+-----+------------+-------+
12 rows in set (0.00 sec)

mysql> select * from course;
+-----+-----------------+--------+
| cid | cname           | credit |
+-----+-----------------+--------+
|   1 | C++基础课程     |      5 |
|   2 | C++高级课程     |     10 |
|   3 | C++项目开发     |      8 |
|   4 | C++算法课程     |     12 |
+-----+-----------------+--------+
4 rows in set (0.02 sec)

mysql> desc student;
+-------+------------------+------+-----+---------+----------------+
| Field | Type             | Null | Key | Default | Extra          |
+-------+------------------+------+-----+---------+----------------+
| uid   | int unsigned     | NO   | PRI | NULL    | auto_increment |
| name  | varchar(50)      | NO   |     | NULL    |                |
| age   | tinyint unsigned | NO   |     | NULL    |                |
| sex   | enum('M','W')    | NO   |     | NULL    |                |
+-------+------------------+------+-----+---------+----------------+
4 rows in set (0.10 sec)

mysql> desc exams;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| uid   | int unsigned | NO   | PRI | NULL    |       |
| cid   | int unsigned | NO   | PRI | NULL    |       |
| time  | date         | NO   |     | NULL    |       |
| score | float        | NO   |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
4 rows in set (0.00 sec)

mysql> desc course;
+--------+------------------+------+-----+---------+----------------+
| Field  | Type             | Null | Key | Default | Extra          |
+--------+------------------+------+-----+---------+----------------+
| cid    | int unsigned     | NO   | PRI | NULL    | auto_increment |
| cname  | varchar(50)      | NO   |     | NULL    |                |
| credit | tinyint unsigned | NO   |     | NULL    |                |
+--------+------------------+------+-----+---------+----------------+
3 rows in set (0.00 sec)

mysql>
```



### 一、left join

```sql
select a.*,b.* from student a left join exams b on a.uid = b.uid
```

```cpp
mysql> select a.*,b.* from student a left join exams b on a.uid = b.uid;
+-----+----------+-----+-----+------+------+------------+-------+
| uid | name     | age | sex | uid  | cid  | time       | score |
+-----+----------+-----+-----+------+------+------------+-------+
|   1 | zhangsan |  18 | M   |    1 |    1 | 2021-04-09 |    99 |
|   1 | zhangsan |  18 | M   |    1 |    2 | 2021-04-10 |    80 |
|   2 | gaoyang  |  20 | W   |    2 |    2 | 2021-04-10 |    90 |
|   2 | gaoyang  |  20 | W   |    2 |    3 | 2021-04-12 |    85 |
|   3 | chenwei  |  22 | M   |    3 |    1 | 2021-04-09 |    56 |
|   3 | chenwei  |  22 | M   |    3 |    2 | 2021-04-10 |    93 |
|   3 | chenwei  |  22 | M   |    3 |    3 | 2021-04-12 |    89 |
|   3 | chenwei  |  22 | M   |    3 |    4 | 2021-04-11 |   100 |
|   4 | linfeng  |  21 | W   |    4 |    4 | 2021-04-11 |    99 |
|   5 | liuxiang |  19 | W   |    5 |    2 | 2021-04-10 |    59 |
|   5 | liuxiang |  19 | W   |    5 |    3 | 2021-04-12 |    94 |
|   5 | liuxiang |  19 | W   |    5 |    4 | 2021-04-11 |    95 |
|   6 | weiwie   |  20 | M   | NULL | NULL | NULL       |  NULL |
+-----+----------+-----+-----+------+------+------------+-------+
13 rows in set (0.00 sec)
```



### 二、right join

```sql
mysql> select a.*,b.* from student a right join exams b on a.uid = b.uid;
```

```cpp
mysql> select a.*,b.* from student a right join exams b on a.uid = b.uid;
+------+----------+------+------+-----+-----+------------+-------+
| uid  | name     | age  | sex  | uid | cid | time       | score |
+------+----------+------+------+-----+-----+------------+-------+
|    1 | zhangsan |   18 | M    |   1 |   1 | 2021-04-09 |    99 |
|    1 | zhangsan |   18 | M    |   1 |   2 | 2021-04-10 |    80 |
|    2 | gaoyang  |   20 | W    |   2 |   2 | 2021-04-10 |    90 |
|    2 | gaoyang  |   20 | W    |   2 |   3 | 2021-04-12 |    85 |
|    3 | chenwei  |   22 | M    |   3 |   1 | 2021-04-09 |    56 |
|    3 | chenwei  |   22 | M    |   3 |   2 | 2021-04-10 |    93 |
|    3 | chenwei  |   22 | M    |   3 |   3 | 2021-04-12 |    89 |
|    3 | chenwei  |   22 | M    |   3 |   4 | 2021-04-11 |   100 |
|    4 | linfeng  |   21 | W    |   4 |   4 | 2021-04-11 |    99 |
|    5 | liuxiang |   19 | W    |   5 |   2 | 2021-04-10 |    59 |
|    5 | liuxiang |   19 | W    |   5 |   3 | 2021-04-12 |    94 |
|    5 | liuxiang |   19 | W    |   5 |   4 | 2021-04-11 |    95 |
+------+----------+------+------+-----+-----+------------+-------+
12 rows in set (0.01 sec)

mysql>
```

explain 分析：

```sql
mysql> explain select a.*,b.* from student a right join exams b on a.uid = b.uid;
+----+-------------+-------+------------+--------+---------------+---------+---------+--------------+------+----------+-------+
| id | select_type | table | partitions | type   | possible_keys | key     | key_len | ref          | rows | filtered | Extra |
+----+-------------+-------+------------+--------+---------------+---------+---------+--------------+------+----------+-------+
|  1 | SIMPLE      | b     | NULL       | ALL    | NULL          | NULL    | NULL    | NULL         |   12 |   100.00 | NULL  |
|  1 | SIMPLE      | a     | NULL       | eq_ref | PRIMARY       | PRIMARY | 4       | school.b.uid |    1 |   100.00 | NULL  |
+----+-------------+-------+------------+--------+---------------+---------+---------+--------------+------+----------+-------+
2 rows in set, 1 warning (0.00 sec)

mysql> explain select a.*,b.* from student a left join exams b on a.uid = b.uid;
+----+-------------+-------+------------+------+---------------+---------+---------+--------------+------+----------+-------+
| id | select_type | table | partitions | type | possible_keys | key     | key_len | ref          | rows | filtered | Extra |
+----+-------------+-------+------------+------+---------------+---------+---------+--------------+------+----------+-------+
|  1 | SIMPLE      | a     | NULL       | ALL  | NULL          | NULL    | NULL    | NULL         |    6 |   100.00 | NULL  |
|  1 | SIMPLE      | b     | NULL       | ref  | PRIMARY       | PRIMARY | 4       | school.a.uid |    2 |   100.00 | NULL  |
+----+-------------+-------+------------+------+---------------+---------+---------+--------------+------+----------+-------+
2 rows in set, 1 warning (0.00 sec)

mysql>
```

现在有这么一个情景：我们要查询没有考过试的学生

1. 我们可以使用子连接

    ```sql
    select * from student where uid not in (select uid from exams);
    ```

    ```sql
    mysql> select * from student where uid not in (select uid from exams);
    +-----+--------+-----+-----+
    | uid | name   | age | sex |
    +-----+--------+-----+-----+
    |   6 | weiwie |  20 | M   |
    +-----+--------+-----+-----+
    1 row in set (0.00 sec)
    
    mysql>
    ```

    但是子链接有个问题，我们使用`not in`有时候是使用不到索引的，同时可能会产生中间表，这样效率并不高

    ```sql
    mysql> explain select * from student where uid not in (select uid from exams);
    +----+-------------+---------+------------+------+---------------+---------+---------+--------------------+------+----------+--------------------------------------+
    | id | select_type | table   | partitions | type | possible_keys | key     | key_len | ref                | rows | filtered | Extra
                   |
    +----+-------------+---------+------------+------+---------------+---------+---------+--------------------+------+----------+--------------------------------------+
    |  1 | SIMPLE      | student | NULL       | ALL  | NULL          | NULL    | NULL    | NULL               |    6 |   100.00 | NULL
                   |
    |  1 | SIMPLE      | exams   | NULL       | ref  | PRIMARY       | PRIMARY | 4       | school.student.uid |    2 |   100.00 | Using where; Not exists; Using index |
    +----+-------------+---------+------------+------+---------------+---------+---------+--------------------+------+----------+--------------------------------------+
    2 rows in set, 1 warning (0.00 sec)
    
    mysql>
    ```

2. 使用左连接

    ```sql
    select a.* from student a left join exams b on a.uid = b.uid where b.cid is null;
    ```

    ```sql
    mysql> select a.* from student a left join exams b on a.uid = b.uid where b.cid is null;
    +-----+--------+-----+-----+
    | uid | name   | age | sex |
    +-----+--------+-----+-----+
    |   6 | weiwie |  20 | M   |
    +-----+--------+-----+-----+
    1 row in set (0.01 sec)
    
    mysql> explain select a.* from student a left join exams b on a.uid = b.uid where b.cid is null;
    +----+-------------+-------+------------+------+---------------+---------+---------+--------------+------+----------+--------------------------------------+
    | id | select_type | table | partitions | type | possible_keys | key     | key_len | ref          | rows | filtered | Extra
           |
    +----+-------------+-------+------------+------+---------------+---------+---------+--------------+------+----------+--------------------------------------+
    |  1 | SIMPLE      | a     | NULL       | ALL  | NULL          | NULL    | NULL    | NULL         |    6 |   100.00 | NULL
           |
    |  1 | SIMPLE      | b     | NULL       | ref  | PRIMARY       | PRIMARY | 4       | school.a.uid |    2 |    10.00 | Using where; Not exists; Using index |
    +----+-------------+-------+------------+------+---------------+---------+---------+--------------+------+----------+--------------------------------------+
    2 rows in set, 1 warning (0.01 sec)
    
    mysql>
    ```

    

查看没有参加课程号为3考试的学生

```sql
select a.* from student a 
left join exams b on a.uid = b.uid and b.cid = 3 
where b.cid is null;
```

```sql
mysql> select a.* from student a  left join exams b on a.uid = b.uid and b.cid = 3  where b.cid is null;
+-----+----------+-----+-----+
| uid | name     | age | sex |
+-----+----------+-----+-----+
|   1 | zhangsan |  18 | M   |
|   4 | linfeng  |  21 | W   |
|   6 | weiwie   |  20 | M   |
+-----+----------+-----+-----+
3 rows in set (0.01 sec)

mysql>
```

explain 查询

```sql
mysql> explain select a.* from student a  left join exams b on a.uid = b.uid and b.cid = 3  where b.cid is null;
+----+-------------+-------+------------+--------+---------------+---------+---------+--------------------+------+----------+--------------------------------------+
| id | select_type | table | partitions | type   | possible_keys | key     | key_len | ref                | rows | filtered | Extra
               |
+----+-------------+-------+------------+--------+---------------+---------+---------+--------------------+------+----------+--------------------------------------+
|  1 | SIMPLE      | a     | NULL       | ALL    | NULL          | NULL    | NULL    | NULL               |    5 |   100.00 | NULL
               |
|  1 | SIMPLE      | b     | NULL       | eq_ref | PRIMARY       | PRIMARY | 8       | school.a.uid,const |    1 |   100.00 | Using where; Not exists; Using index |
+----+-------------+-------+------------+--------+---------------+---------+---------+--------------------+------+----------+--------------------------------------+
2 rows in set, 1 warning (0.00 sec)

mysql>
```

