title: MySQL-分组group by
date: 2025-03-30 08:37:00
categories: 数据库
tags: [MySQL]
---
```sql
mysql> select name,age from user group by age;
ERROR 1055 (42000): Expression #1 of SELECT list is not in GROUP BY clause and contains nonaggregated column 'school.user.name' which is not functionally dependent on columns in GROUP BY clause; this is incompatible with sql_mode=only_full_group_by
mysql>
```

使用group by进行分组时，不应该查询别的字段，例如这里的name,因为MySQL不知道要显示哪个用户，我们只需要查询分组的字段即可，或者进行一些统计计算，如：

```sql
mysql> select * from user;
+----+----------+-----+-----+
| id | name     | age | sex |
+----+----------+-----+-----+
|  1 | zhangsan |  16 | W   |
|  2 | lisi     |  21 | M   |
|  3 | laoliu   |  24 | W   |
|  4 | jianzhe  |  16 | W   |
|  5 | wangwei  |  21 | M   |
+----+----------+-----+-----+
5 rows in set (0.00 sec)

mysql> select age from user group by age;
+-----+
| age |
+-----+
|  16 |
|  21 |
|  24 |
+-----+
3 rows in set (0.00 sec)

mysql> select age,count(age) from user group by age;
+-----+------------+
| age | count(age) |
+-----+------------+
|  16 |          2 |
|  21 |          2 |
|  24 |          1 |
+-----+------------+
3 rows in set (0.00 sec)

mysql> select age,sum(age) from user group by age;
+-----+----------+
| age | sum(age) |
+-----+----------+
|  16 |       32 |
|  21 |       42 |
|  24 |       24 |
+-----+----------+
3 rows in set (0.02 sec)

mysql> select age,sum(age) from user group by age having age > 20;
+-----+----------+
| age | sum(age) |
+-----+----------+
|  21 |       42 |
|  24 |       24 |
+-----+----------+
2 rows in set (0.00 sec)

mysql> select age,sum(age) from user where age > 20 group by age;#推荐使用where,age有索引的话where可以使用索引
+-----+----------+
| age | sum(age) |
+-----+----------+
|  21 |       42 |
|  24 |       24 |
+-----+----------+
2 rows in set (0.00 sec)

mysql> select age,sex,count(*) from user group by age,sex;
+-----+-----+----------+
| age | sex | count(*) |
+-----+-----+----------+
|  16 | W   |        2 |
|  21 | M   |        2 |
|  24 | W   |        1 |
+-----+-----+----------+
3 rows in set (0.00 sec)

mysql>

mysql> select age,sex,count(id) from user group by age,sex order by age desc; 
+-----+-----+-----------+
| age | sex | count(id) |
+-----+-----+-----------+
|  24 | W   |         1 |
|  21 | M   |         2 |
|  16 | W   |         2 |
+-----+-----+-----------+
3 rows in set (0.01 sec)

mysql>
```

其实，从上面可以看出，其实`order by`内部实际上是进行了排序的，我们使用explain查看

```sql
mysql> explain select age from user group by age;
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+-----------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra           |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+-----------------+
|  1 | SIMPLE      | user  | NULL       | ALL  | NULL          | NULL | NULL    | NULL |    5 |   100.00 | Using temporary |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+-----------------+
1 row in set, 1 warning (0.00 sec)

mysql> explain select name from user group by name;
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra       |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------------+
|  1 | SIMPLE      | user  | NULL       | index | name          | name | 202     | NULL |    5 |   100.00 | Using index |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------------+
1 row in set, 1 warning (0.00 sec)

mysql>
```

可以看到，在使用没有索引的字段排序时，MySQL使用的是`Using temporary`，使用临时表进行排序，而使用有索引的`name`排序时，是使用索引树进行排序的，显然，group by在分组时的效率与索引有关系