title: MySQL-内连接inner join
date: 2025-03-30 08:41:00
categories: 数据库
tags: [MySQL]
---
```sql
mysql> use school;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
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
12 rows in set (0.01 sec)

mysql> select * from course;
+-----+-----------------+--------+
| cid | cname           | credit |
+-----+-----------------+--------+
|   1 | C++基础课程     |      5 |
|   2 | C++高级课程     |     10 |
|   3 | C++项目开发     |      8 |
|   4 | C++算法课程     |     12 |
+-----+-----------------+--------+
4 rows in set (0.01 sec)

mysql> select * from student;
+-----+----------+-----+-----+
| uid | name     | age | sex |
+-----+----------+-----+-----+
|   1 | zhangsan |  18 | M   |
|   2 | gaoyang  |  20 | W   |
|   3 | chenwei  |  22 | M   |
|   4 | linfeng  |  21 | W   |
|   5 | liuxiang |  19 | W   |
+-----+----------+-----+-----+
5 rows in set (0.01 sec)

mysql> desc student;
+-------+------------------+------+-----+---------+----------------+
| Field | Type             | Null | Key | Default | Extra          |
+-------+------------------+------+-----+---------+----------------+
| uid   | int unsigned     | NO   | PRI | NULL    | auto_increment |
| name  | varchar(50)      | NO   |     | NULL    |                |
| age   | tinyint unsigned | NO   |     | NULL    |                |
| sex   | enum('M','W')    | NO   |     | NULL    |                |
+-------+------------------+------+-----+---------+----------------+
4 rows in set (0.01 sec)

mysql> desc course;
+--------+------------------+------+-----+---------+----------------+
| Field  | Type             | Null | Key | Default | Extra          |
+--------+------------------+------+-----+---------+----------------+
| cid    | int unsigned     | NO   | PRI | NULL    | auto_increment |
| cname  | varchar(50)      | NO   |     | NULL    |                |
| credit | tinyint unsigned | NO   |     | NULL    |                |
+--------+------------------+------+-----+---------+----------------+
3 rows in set (0.01 sec)

mysql> desc exams;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| uid   | int unsigned | NO   | PRI | NULL    |       |
| cid   | int unsigned | NO   | PRI | NULL    |       |
| time  | date         | NO   |     | NULL    |       |
| score | float        | NO   |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
4 rows in set (0.01 sec)

mysql>
```

现在需要查看zhangsan同学的详细信息，选修课程id为2的信息和对应的成绩，需要进行多表查询

分析：

1. zhangsan同学的详细信息

    ```sql
    select uid,name,age,sex from student where uid = 1;
    ```

2. zhangsan选修的课程信息

    ```sql
    select cid,cname,credit from course where cid = 2;
    ```

3. 成绩信息

    ```sql
    select uid,cid,time,score from exams where uid = 1 and cid = 2;
    ```

现在，我们需要将上面的三条sql语句结合起来，进行多表查询.

首先，我们需要知道的是，`内连接是需要区分大表和小表的，通过数据量进行区分，数据量大的就为大表，数据量小的就为小表，小表总是先进行全局扫描，然后拿着扫描得到的数据到大表中匹对`（所以，小表使用索引的意义是不大的），最后得到需要的数据

下面是内连接的常用方式：

```sql
select emp.name dept.name from emp 
inner join dept on emp.dept_id = dept.id
inner join ...;
```

需要注意的点是：`inner join`左边的表并不是随意取的，假设将表出现的顺序按A,B,C...这样的顺序起别名，例如这里的`emp`别名为A,后面的`dept`表别名为B，后面以此类推，这里的A，**必须要能够跟后续出现的表有关联**，有联系，例如：A表应该要有B表，C表关联的字段，这样才能建立联系，如有B,C表的id字段，这样才能使用`on`建立联系。上面的`student`,`course`,`exams`三张表，`exams` 表中有 `uid` 字段，可以与 `student` 表关联；同时，它也有 `cid` 字段，可以与 `course` 表关联。因此，`exams` 表作为起点，可以有效地将 `student` 和 `course` 表通过 `uid` 和 `cid` 连接起来。所以这里的`exams`表应该为A表,至于B,C表的顺序并没有要求，SQL 查询优化器在执行查询时会自动决定最优的执行顺序

所以，最终的sql语句如下：

```sql
select c.uid,c.name,c.age,c.sex, b.cid,b.cname,b.credit,a.time,a.score from exams a
inner join course b on a.cid = b.cid
inner join student c on a.uid = c.uid
where a.uid = 1 and a.cid = 2;
```

测试结果：

```sql
mysql> select c.uid,c.name,c.age,c.sex, b.cid,b.cname,b.credit,a.time,a.score from exams a
    -> inner join course b on a.cid = b.cid
    -> inner join student c on a.uid = c.uid
    -> where a.uid = 1 and a.cid = 2;
+-----+----------+-----+-----+-----+-----------------+--------+------------+-------+
| uid | name     | age | sex | cid | cname           | credit | time       | score |
+-----+----------+-----+-----+-----+-----------------+--------+------------+-------+
|   1 | zhangsan |  18 | M   |   2 | C++高级课程     |     10 | 2021-04-10 |    80 |
+-----+----------+-----+-----+-----+-----------------+--------+------------+-------+
1 row in set (0.02 sec)

mysql>
```



如果是查询zhangsan同学的详细信息，所有选修课程的信息和对应的成绩，则sql应该如下：

```sql
select c.uid,c.name,c.age,c.sex, b.cid,b.cname,b.credit,a.time,a.score from exams a
inner join course b on a.cid = b.cid
inner join student c on a.uid = c.uid
where a.uid = 1;
```

测试结果：

```sql
mysql> select c.uid,c.name,c.age,c.sex, b.cid,b.cname,b.credit,a.time,a.score from exams a
    -> inner join course b on a.cid = b.cid
    -> inner join student c on a.uid = c.uid
    -> where a.uid = 1;
+-----+----------+-----+-----+-----+-----------------+--------+------------+-------+
| uid | name     | age | sex | cid | cname           | credit | time       | score |
+-----+----------+-----+-----+-----+-----------------+--------+------------+-------+
|   1 | zhangsan |  18 | M   |   1 | C++基础课程     |      5 | 2021-04-09 |    99 |
|   1 | zhangsan |  18 | M   |   2 | C++高级课程     |     10 | 2021-04-10 |    80 |
+-----+----------+-----+-----+-----+-----------------+--------+------------+-------+
2 rows in set (0.02 sec)

mysql>
```



如果是要查看课程id为2,且成绩大于等于90的信息

```sql
select c.uid,c.name,c.age,c.sex, b.cid,b.cname,b.credit,a.time,a.score from exams a
inner join course b on a.cid = b.cid
inner join student c on a.uid = c.uid
where a.cid = 2 and a.score >= 90;
```

测试结果：

```sql
mysql> select c.uid,c.name,c.age,c.sex, b.cid,b.cname,b.credit,a.time,a.score from exams a
    -> inner join course b on a.cid = b.cid
    -> inner join student c on a.uid = c.uid
    -> where a.cid = 2 and a.score >= 90;
+-----+---------+-----+-----+-----+-----------------+--------+------------+-------+
| uid | name    | age | sex | cid | cname           | credit | time       | score |
+-----+---------+-----+-----+-----+-----------------+--------+------------+-------+
|   2 | gaoyang |  20 | W   |   2 | C++高级课程     |     10 | 2021-04-10 |    90 |
|   3 | chenwei |  22 | M   |   2 | C++高级课程     |     10 | 2021-04-10 |    93 |
+-----+---------+-----+-----+-----+-----------------+--------+------------+-------+
2 rows in set (0.00 sec)

mysql>
```



通过课程分组，计算每个课程的选课人数,按降序排序

```sql
select b.cid,b.cname,b.credit,count(*) number from exams a
inner join course b on a.cid = b.cid
group by a.cid
order by number desc;
```

测试结果：

```sql
mysql> select b.cid,b.cname,b.credit,count(*) number from exams a
    -> inner join course b on a.cid = b.cid
    -> group by a.cid
    -> order by number desc;
+-----+-----------------+--------+--------+
| cid | cname           | credit | number |
+-----+-----------------+--------+--------+
|   2 | C++高级课程     |     10 |      4 |
|   3 | C++项目开发     |      8 |      3 |
|   4 | C++算法课程     |     12 |      3 |
|   1 | C++基础课程     |      5 |      2 |
+-----+-----------------+--------+--------+
4 rows in set (0.00 sec)

mysql>
```



通过课程分组，计算每个课程成绩大于等于90分的选课人数,按降序排序

```sql
select b.cid,b.cname,b.credit,count(*) number from exams a
inner join course b on a.cid = b.cid
where a.score >= 90
group by a.cid
order by number desc;
```

测试结果：

```sql
mysql> select b.cid,b.cname,b.credit,count(*) number from exams a
    -> inner join course b on a.cid = b.cid
    -> where a.score >= 90
    -> group by a.cid
    -> order by number desc;
+-----+-----------------+--------+--------+
| cid | cname           | credit | number |
+-----+-----------------+--------+--------+
|   4 | C++算法课程     |     12 |      3 |
|   2 | C++高级课程     |     10 |      2 |
|   1 | C++基础课程     |      5 |      1 |
|   3 | C++项目开发     |      8 |      1 |
+-----+-----------------+--------+--------+
4 rows in set (0.01 sec)

mysql>
```



cid=2这门课程考试成绩的最高分的学生信息和课程信息

```sql
select c.uid, c.name, c.age, c.sex, b.cid, b.cname, b.credit, a.score
from exams a
inner join course b on a.cid = b.cid
inner join student c on a.uid = c.uid
where a.cid = 2
  and a.score = (
      select max(score)
      from exams
      where cid = 2
  );
```

测试结果

```sql
mysql> select c.uid, c.name, c.age, c.sex, b.cid, b.cname, b.credit, a.score
(score)
      from exams
      where cid = 2
  );    -> from exams a
    -> inner join course b on a.cid = b.cid
    -> inner join student c on a.uid = c.uid
    -> where a.cid = 2
    ->   and a.score = (
    ->       select max(score)
    ->       from exams
    ->       where cid = 2
    ->   );
+-----+---------+-----+-----+-----+-----------------+--------+-------+
| uid | name    | age | sex | cid | cname           | credit | score |
+-----+---------+-----+-----+-----+-----------------+--------+-------+
|   3 | chenwei |  22 | M   |   2 | C++高级课程     |     10 |    93 |
+-----+---------+-----+-----+-----+-----------------+--------+-------+
1 row in set (0.12 sec)

+-------+
| score |
+-------+
|    80 |
|    90 |
|    93 |
|    59 |
+-------+
4 rows in set (0.00 sec)

mysql>
```



每门课程考试的平均成绩+课程信息

```sql
select b.cid,b.cname,b.credit,ROUND(AVG(a.score), 2) average_score from exams a
inner join course b on a.cid = b.cid
group by a.cid
order by average_score desc;
```

测试结果：

```sql
mysql> select b.cid,b.cname,b.credit,ROUND(AVG(a.score), 2) average_score from exams a
    -> inner join course b on a.cid = b.cid
    -> group by a.cid
    -> order by average_score desc;
+-----+-----------------+--------+---------------+
| cid | cname           | credit | average_score |
+-----+-----------------+--------+---------------+
|   4 | C++算法课程     |     12 |            98 |
|   3 | C++项目开发     |      8 |         89.33 |
|   2 | C++高级课程     |     10 |          80.5 |
|   1 | C++基础课程     |      5 |          77.5 |
+-----+-----------------+--------+---------------+
4 rows in set (0.01 sec)

mysql>
```





### 厉害点的用法：

在学习limit时，我们知道limit的偏移是需要时间的，我们知道可以使用下面这种方式过滤调偏移的时间，这种方式是最理想的

```sql
select * from t_user where id > 上一页最后一条数据的id值 limit 10; 
```

问题是，我们有时候并不知道最后一条数据的索引值导致无法使用where,那么我们该如何提高搜索效率呢？

例如下面这种情况

```sql
mysql> select count(*) from t_user;
+----------+
| count(*) |
+----------+
|  2000000 |
+----------+
1 row in set (3.07 sec)

mysql> desc t_user;
+----------+--------------+------+-----+---------+----------------+
| Field    | Type         | Null | Key | Default | Extra          |
+----------+--------------+------+-----+---------+----------------+
| id       | int          | NO   | PRI | NULL    | auto_increment |
| email    | varchar(255) | YES  |     | NULL    |                |
| password | varchar(255) | YES  |     | NULL    |                |
+----------+--------------+------+-----+---------+----------------+
3 rows in set (0.11 sec)

mysql> select * from t_user limit 1000000, 10;
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
10 rows in set (0.78 sec)

mysql> select id from t_user limit 1000000, 10;
+---------+
| id      |
+---------+
| 1000001 |
| 1000002 |
| 1000003 |
| 1000004 |
| 1000005 |
| 1000006 |
| 1000007 |
| 1000008 |
| 1000009 |
| 1000010 |
+---------+
10 rows in set (0.27 sec)

mysql>
```

总所周知，select的字段越多，查询的速度越慢，例如这里只查询id和查询全部数据，两种的时间差是非常明显的。在这个优化查询逻辑的例子中，所以我们的目标是：**在查询全部字段的情况下，实现与仅查询 `id` 相似的效率**。通过使用 `INNER JOIN` 和子查询，我们可以利用索引来加速查询，减少 `LIMIT` 偏移带来的时间开销。

我们的想法：

1. **利用索引查询 ID**：首先，通过 `LIMIT` 和 `OFFSET` 来快速获取目标记录的 `id` 列表。因为 `id` 列通常有索引，所以仅查询 `id` 的效率会非常高，即使偏移量很大（例如 `LIMIT 1000000, 10`）。
2. **使用 `INNER JOIN` 加速主表查询**：然后，我们将这些 `id` 列表作为一个小的临时表（即子查询结果），用 `INNER JOIN` 与原表进行连接。由于我们只连接到已知的 `id` 集合，这个过程非常高效，并且可以避免扫描大数据集。
3. **只读取必要的数据行**：通过这种方法，我们能够在查询全部字段的同时，仅从原表中检索那些与 `id` 列表匹配的行，避免了全表扫描。

```sql
select * from t_user a
inner join (select id from t_user limit 1000000,10) b on a.id = b.id;
```

测试结果

```sql
mysql> select * from t_user a
    -> inner join (select id from t_user limit 1000000,10) b on a.id = b.id;
+---------+------------------+----------+---------+
| id      | email            | password | id      |
+---------+------------------+----------+---------+
| 1000001 | 154985@gmail.com | 154985   | 1000001 |
| 1000002 | 845017@gmail.com | 845017   | 1000002 |
| 1000003 | 154986@gmail.com | 154986   | 1000003 |
| 1000004 | 845018@gmail.com | 845018   | 1000004 |
| 1000005 | 154987@gmail.com | 154987   | 1000005 |
| 1000006 | 845019@gmail.com | 845019   | 1000006 |
| 1000007 | 154988@gmail.com | 154988   | 1000007 |
| 1000008 | 845020@gmail.com | 845020   | 1000008 |
| 1000009 | 154989@gmail.com | 154989   | 1000009 |
| 1000010 | 845021@gmail.com | 845021   | 1000010 |
+---------+------------------+----------+---------+
10 rows in set (0.30 sec)

mysql>
```

```sql
mysql> explain select * from t_user a inner join (select id from t_user limit 1000000,10) b on a.id = b.id;
+----+-------------+------------+------------+--------+---------------+---------+---------+------+---------+----------+-------------+
| id | select_type | table      | partitions | type   | possible_keys | key     | key_len | ref  | rows    | filtered | Extra       |
+----+-------------+------------+------------+--------+---------------+---------+---------+------+---------+----------+-------------+
|  1 | PRIMARY     | <derived2> | NULL       | ALL    | NULL          | NULL    | NULL    | NULL | 1000010 |   100.00 | NULL        |
|  1 | PRIMARY     | a          | NULL       | eq_ref | PRIMARY       | PRIMARY | 4       | b.id |       1 |   100.00 | NULL        |
|  2 | DERIVED     | t_user     | NULL       | index  | NULL          | PRIMARY | 4       | NULL | 1977287 |   100.00 | Using index |
+----+-------------+------------+------------+--------+---------------+---------+---------+------+---------+----------+-------------+
3 rows in set, 1 warning (0.07 sec)

mysql>
```

通过explain我们可以发现，这条sql首先进行了小表的扫描，扫描的行数大概是1000000行，将返回的十条数据作为一张临时表,然后提供给主表查询数据，主表使用索引的方式查询



`inner jorn`的过滤条件放在where后面和放在on连接条件里的效果是一致的,MySQL可能将and优化为where以使用索引

```sql
select a.*,b.* from exams a inner join
student b on a.uid = b.uid
and b.uid = 3;

select a.*,b.* from exams a inner join
student b on a.uid = b.uid
where b.uid = 3;
```

测试结果：

```sql
mysql> select a.*,b.* from exams a inner join
    -> student b on a.uid = b.uid
    -> where b.uid = 3;
+-----+-----+------------+-------+-----+---------+-----+-----+
| uid | cid | time       | score | uid | name    | age | sex |
+-----+-----+------------+-------+-----+---------+-----+-----+
|   3 |   1 | 2021-04-09 |    56 |   3 | chenwei |  22 | M   |
|   3 |   2 | 2021-04-10 |    93 |   3 | chenwei |  22 | M   |
|   3 |   3 | 2021-04-12 |    89 |   3 | chenwei |  22 | M   |
|   3 |   4 | 2021-04-11 |   100 |   3 | chenwei |  22 | M   |
+-----+-----+------------+-------+-----+---------+-----+-----+
4 rows in set (0.00 sec)

mysql> select a.*,b.* from exams a inner join
    -> student b on a.uid = b.uid
    -> and b.uid = 3;
+-----+-----+------------+-------+-----+---------+-----+-----+
| uid | cid | time       | score | uid | name    | age | sex |
+-----+-----+------------+-------+-----+---------+-----+-----+
|   3 |   1 | 2021-04-09 |    56 |   3 | chenwei |  22 | M   |
|   3 |   2 | 2021-04-10 |    93 |   3 | chenwei |  22 | M   |
|   3 |   3 | 2021-04-12 |    89 |   3 | chenwei |  22 | M   |
|   3 |   4 | 2021-04-11 |   100 |   3 | chenwei |  22 | M   |
+-----+-----+------------+-------+-----+---------+-----+-----+
4 rows in set (0.00 sec)
    
mysql> explain select a.*,b.* from exams a inner join student b on a.uid = b.uid where b.uid = 3;
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref   | rows | filtered | Extra |
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
|  1 | SIMPLE      | b     | NULL       | const | PRIMARY       | PRIMARY | 4       | const |    1 |   100.00 | NULL  |
|  1 | SIMPLE      | a     | NULL       | ref   | PRIMARY       | PRIMARY | 4       | const |    4 |   100.00 | NULL  |
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
2 rows in set, 1 warning (0.01 sec)

mysql> explain select a.*,b.* from exams a inner join student b on a.uid = b.uid and b.uid = 3;
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref   | rows | filtered | Extra |
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
|  1 | SIMPLE      | b     | NULL       | const | PRIMARY       | PRIMARY | 4       | const |    1 |   100.00 | NULL  |
|  1 | SIMPLE      | a     | NULL       | ref   | PRIMARY       | PRIMARY | 4       | const |    4 |   100.00 | NULL  |
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
2 rows in set, 1 warning (0.06 sec)
```

