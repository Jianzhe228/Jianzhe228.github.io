title: MySQL-索引
date: 2025-03-28 17:47:00
categories: 数据库
tags: [MySQL]
---
索引是创建在表上的，是对数据库表中一列或者多列的值进行排序的一种结果。`索引的核心是提高查询的速度！`

##### 一、索引的优缺点：

- 索引的优点： 提高查询效率

- 索引的缺点： 索引并非越多越好，过多的索引会导致CPU使用率居高不下，由于数据的改变，会造成索引文件的改动，过多的磁盘I/O造成CPU负荷太重

##### 二、索引类型

1. 普通索引：没有任何限制条件，可以给任何类型的字段创建普通索引
2. 唯一性索引：使用**UNIQUE**修饰的字段,使用`unique`自动创建索引(MyISAM, InnoDB)，值不能够重复，主键索引就隶属于唯一性索引
3. 主键索引：使用**Primary Key**修饰的字段会自动创建索引(MyISAM, InnoDB)
4. `单列索引`：在一个字段上创建索引
5. `多列索引`：在表的多个字段上创建索引 (uid+cid，**多列索引必须使用到第一个列，才能用到多列索引，否则索引用不上**)

##### 三、索引操作：

1. 创建索引

    ```sql
    create index 索引名 on 表名(要添加索引的字段(索引长度))
    #CREATE INDEX idx_username ON users(username(10));
    ```

2. 删除索引

    ```sql
    DROP INDEX 索引名 ON 表名;
    #DROP INDEX idx_username ON users;
    ```


##### 四、索引使用的注意事项：

1. 经常作为where条件过滤的字段考虑添加索引
2. 字符串列创建索引时，可以规定索引的长度，避免索引值的长度key_len过长,可以提高速度，但存在风险（见5.8）
3. **索引字段涉及类型强转、mysql函数调用、表达式计算等，索引就用不上了**

使用示例：

```sql
mysql> select count(*) from t_user;
+----------+
| count(*) |
+----------+
|  2000000 |
+----------+
1 row in set (2.58 sec)

mysql> show create table t_user\G
*************************** 1. row ***************************
       Table: t_user
Create Table: CREATE TABLE `t_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4000001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.02 sec)
    
mysql> select * from t_user where password = 1000000;
+---------+-------------------+----------+
| id      | email             | password |
+---------+-------------------+----------+
| 1309956 | 1000000@gmail.com | 1000000  |
+---------+-------------------+----------+
1 row in set (1.41 sec)

mysql> explain select * from t_user where password = 1000000;
+----+-------------+--------+------------+------+---------------+------+---------+------+---------+----------+-------------+
| id | select_type | table  | partitions | type | possible_keys | key  | key_len | ref  | rows    | filtered | Extra       |
+----+-------------+--------+------------+------+---------------+------+---------+------+---------+----------+-------------+
|  1 | SIMPLE      | t_user | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 1977287 |    10.00 | Using where |
+----+-------------+--------+------------+------+---------------+------+---------+------+---------+----------+-------------+
1 row in set, 1 warning (0.03 sec)

mysql> create index passwd_index on t_user(password(20));
Query OK, 0 rows affected (14.03 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> show create table t_user\G
*************************** 1. row ***************************
       Table: t_user
Create Table: CREATE TABLE `t_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `passwd_index` (`password`(20))
) ENGINE=InnoDB AUTO_INCREMENT=4000001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.01 sec)

mysql> select * from t_user where password = 1000000;
+---------+-------------------+----------+
| id      | email             | password |
+---------+-------------------+----------+
| 1309956 | 1000000@gmail.com | 1000000  |
+---------+-------------------+----------+
1 row in set (1.85 sec)

mysql> explain select * from t_user where password = 1000000;#发现没有使用索引，原因是使用了强转，password是字符串类型，而这里使用的是数字
+----+-------------+--------+------------+------+---------------+------+---------+------+---------+----------+-------------+
| id | select_type | table  | partitions | type | possible_keys | key  | key_len | ref  | rows    | filtered | Extra       |
+----+-------------+--------+------------+------+---------------+------+---------+------+---------+----------+-------------+
|  1 | SIMPLE      | t_user | NULL       | ALL  | passwd_index  | NULL | NULL    | NULL | 1977287 |    10.00 | Using where |
+----+-------------+--------+------------+------+---------------+------+---------+------+---------+----------+-------------+
1 row in set, 3 warnings (0.01 sec)

mysql> select * from t_user where password = '1000000';
+---------+-------------------+----------+
| id      | email             | password |
+---------+-------------------+----------+
| 1309956 | 1000000@gmail.com | 1000000  |
+---------+-------------------+----------+
1 row in set (0.00 sec)

mysql> explain select * from t_user where password = '1000000';#成功使用到索引
+----+-------------+--------+------------+------+---------------+--------------+---------+-------+------+----------+-------------+
| id | select_type | table  | partitions | type | possible_keys | key          | key_len | ref   | rows | filtered | Extra       |
+----+-------------+--------+------------+------+---------------+--------------+---------+-------+------+----------+-------------+
|  1 | SIMPLE      | t_user | NULL       | ref  | passwd_index  | passwd_index | 83      | const |    1 |   100.00 | Using where |
+----+-------------+--------+------------+------+---------------+--------------+---------+-------+------+----------+-------------+
1 row in set, 1 warning (0.00 sec)
```

在最后的explain中，我们发现key_len为83，这是因为我们使用的是 `utf8mb4` 字符集，而在 `utf8mb4` 中，每个字符占用最多 4 个字节。因此，索引长度为 20 个字符时，实际的字节长度计算为：20 * 4 = 80; 在 MySQL 中，`NULL` 值的字段通常会占用额外的 1 到 3 个字节来存储 `NULL` 标记。因此，最终索引长度计算可能会增加到 83 个字节，3 个字节用于处理 `NULL` 标记。

##### 五、索引的底层原理：

###### 1、索引底层原理

首先，MySQL先分析sql语句，如`select * from user where uid = 3`，**如果涉及到索引**，MySQL会通过使用B+树减少磁盘IO，**存储引擎会请求kennel从磁盘中读取索引和数据信息，构建索引树，提高搜索效率**。

###### 2、聚集索引和非聚集索引

- 聚集索引：**主键索引和数据存储在一起**的存储结构就是聚集索引，聚集索引不会发生回表

- 非聚集索引：**主键索引和数据没有存储在一起**，可能会发生回表

- 什么是回表？

    “回表”特指查询时通过二级索引找到主键值后，再回到主键索引树中查询完整的行数据。`二级索引 -> 主键值 -> 主键索引树 -> 行数据。`,Innodb的二级索引树可能会导致回表的发生，这是因为 **InnoDB 的二级索引 `data` 部分存储的是主键值，而数据存储在主键索引树中，因此需要额外的一次访问操作**。

###### 3、主键索引和二级索引

- 对于Innodb

    **主键索引（聚集索引）：**

    - **构成**：主键索引树的 `key` 是主键字段，`data` 是整行数据。
    - 特点:
        - 主键索引和数据存储在一起，因此称为 **聚集索引**。
        - 每张表只能有一个主键索引。
        - 数据行物理上按照主键值顺序存储，插入数据时会根据主键值调整存储顺序。

    **二级索引（辅助索引）：**

    - **构成**：二级索引树的 `key` 是二级索引字段，`data` 是该记录对应的主键值。

    - 特点:
        - 二级索引是 **非聚集索引**。
        
        - **查询时，若仅依赖二级索引字段可以直接获取数据，否则需要通过存储的主键值在主键索引树中再次查找整行数据，这称为 回表。**
        
        - **优化**：合理设计查询，尽量使 `SELECT` 子句中需要的字段全部包含在索引覆盖中，减少回表操作。**索引覆盖**是指当查询所需的所有数据都包含在索引中时，数据库引擎可以直接从索引中获取数据而**无需回表**
        
            假设有一个用户表：
        
            ```cpp
            CREATE TABLE users (
                id INT PRIMARY KEY,
                name VARCHAR(100),
                age INT,
                city VARCHAR(100),
                INDEX idx_name_age (name, age)
            );
            
            ```
        
            情况1：需要回表，虽然使用了`idx_name_age`索引，但需要获取所有字段（包括不在索引中的`city`），必须回表查询完整记录
        
            ```cpp
            SELECT * FROM users WHERE name = '张三';
            ```
        
            情况2：索引覆盖，查询的字段`name`和`age`都包含在`idx_name_age`索引中，引擎可以直接从索引获取数据，无需回表
        
            ```cpp
            SELECT name, age FROM users WHERE name = '张三';
            ```

    > **总结：**
    >
    > - 主键索引：聚集索引，`key` 是主键，`data` 是整行数据。
    > - 二级索引：非聚集索引，`key` 是索引字段，`data` 是主键值。

- 对于MyISAM

    **主键索引和二级索引：**
    
    - **构成**：索引树的 `key` 是索引字段，`data` 是对应数据的文件地址（即指向数据存储文件的偏移量）。
    - 特点：
        - 无论是主键索引还是二级索引，其存储结构是相同的，**索引都仅存储数据的地址，而不存储实际数据**。
        - **MyISAM 中数据和索引是分开存储的**，因此其索引树始终是 **非聚集索引**。
        - **主键和普通索引在存储上没有区别**，只是主键要求唯一且不可为空。
    
    **查询特点：**
    
    - 查询时，先根据索引找到数据地址，然后根据地址直接读取对应的行数据。
    
    > **总结：**
    >
    > - `主键索引和二级索引在存储结构上没有区别，都是非聚集索引。`
    > - `key` 是索引字段，`data` 是数据的物理地址。

    | 特性                   | InnoDB 主键索引 | InnoDB 二级索引 | MyISAM 主键索引 | MyISAM 二级索引 |
    | ---------------------- | --------------- | --------------- | --------------- | --------------- |
    | 索引树结构             | 聚集索引        | 非聚集索引      | 非聚集索引      | 非聚集索引      |
    | `key`                  | 主键字段        | 二级索引字段    | 主键字段        | 二级索引字段    |
    | `data`                 | 行数据          | 主键值          | 数据的地址      | 数据的地址      |
    | 数据与索引存储是否分离 | 否              | 是              | 是              | 是              |
    | 是否可能回表           | 不会            | 可能            | 不会            | 不会            |

    `虽然MyISAM的data存储的不是行数据而是地址，但严格来说这并不算回表，回表是需要经过主索引树再一次查询`

###### 4、二级索引树和回表

![PixPin_2024-11-15_16-49-40](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-11-15_16-49-40.png)

索引分为主键索引和二级索引，由他们构建的索引树分别叫做主键索引树和二级索引树（或者辅助索引树）

其中，主键索引树和索引树有所区别

1. 主键索引树的key是主键，data的内容是所在行的全部数据。
2. 而辅助索引树的key是辅助索引的值，data是所在记录行的主键值(不是行的全部数据)。

这个data保存数据的差异，就会导致在使用二级索引时，会出现回表的问题，什么是回表，回表就是在二级索引树上找不到数据，需要根据主键值在主索引树上再一次查找，它导致了更多的查询数据和更多的磁盘IO

例如下面的sql，name字段是有索引的

```sql
select name from student where name = 'zhangsan';
```

这里的name是一个二级索引，我们只查询name，可以直接从他的二级索引树上得到，下面的也是,uid和name都能直接从二级索引树上得到

```sql
select uid,name from student where name = 'zhangsan';
```

但是，下面这个就不行,这条语句还查询了sex,age等信息，我们是无法从二级索引树上得到了，索引只能在主索引树上查找，这就涉及到了回表

```sql
select * from student where name = 'zhangsan'
```

![image-20250329015034541](https://images.228610.xyz/2025/03/05e9f7822ca84c1403b0e7b3bb1c4126.webp)

所以，select 后边的字段尽量不要直接使用`*`，而是明确的使用字段名，一个是为了减少回表的发生，第二个是减少以后添加新字段时，不会影响现有的查询sql查询的结果，以产生意料之外的bug。

###### 5、B+树索引和哈希索引

![image-20250329010958816](https://images.228610.xyz/2025/03/daa6b4181e8b597e2849a1baf2c85660.webp)

创建哈希索引

```sql
create index name_index on student(name) using hash;
```

在Innodb中，上面的sql会生成一个警告且并不会创建哈希索引，这是因为Innodb并不支持哈希索引，他会默认生成一个B+树索引,只有 **Memory** 存储引擎支持显式的 HASH 索引

```sql
mysql> create index name_index on student(name) using hash;
Query OK, 0 rows affected, 1 warning (0.40 sec)
Records: 0  Duplicates: 0  Warnings: 1

mysql> show create table student\G
*************************** 1. row ***************************
    Table: student
Create Table: CREATE TABLE `student` (
`uid` int unsigned NOT NULL AUTO_INCREMENT,
`name` varchar(50) NOT NULL,
`age` tinyint unsigned NOT NULL,
`sex` enum('M','W') NOT NULL,
PRIMARY KEY (`uid`),
KEY `name_index` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
```

查看表的索引,使用`show create table student\G`查看并不准确，应该使用如下sql

```sql
show indexes from student;
```

```sql
mysql> show indexes from student;
+---------+------------+------------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+------------+
| Table   | Non_unique | Key_name   | Seq_in_index | Column_name | Collation | Cardinality | Sub_part | Packed | Null | Index_type | Comment | Index_comment | Visible | Expression |
+---------+------------+------------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+------------+
| student |          0 | PRIMARY    |            1 | uid         | A         |           5 |     NULL |   NULL |      | BTREE      |         |               | YES     | NULL       |
| student |          1 | name_index |            1 | name        | A         |           5 |     NULL |   NULL |      | BTREE      |         |               | YES     | NULL       |
+---------+------------+------------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+------------+
2 rows in set (0.09 sec)
```

哈希索引和B+树索引对比：

1. 使用场景：
    - 哈希索引一般用于数据不需要写入磁盘的,主要用于内存存储引擎，只在内存中使用,不适合需要排序或范围查询的场景。适用于等值查询场景,主要用于高性能的等值查询（内存优先).
    - B+树索引一般需要写入磁盘,适用于范围查询、排序、等值查询等多种场景，适用性更广
2. 磁盘IO
    - 哈希索引的磁盘IO次数较多，每一个节点需要一次磁盘IO
    - B+树索引磁盘IO次数少，一次磁盘IO能够写入多个数据
3. 搜索和排序
    - **哈希索引底层使用散列表实现，需要计算哈希值，无法对数据排序，对于范围搜索和排序的场景不适用，只能用于等值查询，如name = ‘zhangsan’**
    - B+树索引底层是平衡树，在构建索引树时对数据排序，适用于范围查询和排序等场景

总体来说，哈希索引使用较少。

| 特性           | 哈希索引                 | B+树索引                 |
| -------------- | ------------------------ | ------------------------ |
| **使用场景**   | 等值查询，内存优先       | 通用场景，支持磁盘存储   |
| **磁盘 I/O**   | 较多（哈希冲突增加负担） | 较少（设计减少磁盘访问） |
| **搜索复杂度** | O(1)（等值查询）         | O(log(n))                |
| **排序支持**   | 不支持                   | 天然支持                 |
| **范围查询**   | 不支持                   | 高效支持                 |

###### 6、B树

如果MySQL使用B树，B树相比于AVL树(二叉平衡树)的优点是什么？

	假设在一个2000万个数据的场景中，使用**AVL树**（自平衡二叉树）时，由于每个节点只存储一个数据项，树的高度大约为25层。最坏情况下，每次查找操作需要进行25次磁盘I/O，因为每层都需要读取一个磁盘块(读磁盘是按块为单位读取的)。而如果使用**B树**（阶数为500的平衡树），每个节点可以存储多达500个数据项，因此树的高度只有约3层，查找同样的数据仅需要进行3次磁盘I/O。B树通过每个节点存储多个数据项，极大地减少了树的深度和磁盘I/O次数.`最主要的就是减少了磁盘IO的次数`

###### 7、B+树

B树的缺点：

1. 每个节点中有key，也有data，但是**每一个节点的存储空间是有限的**，如果data数据较大时会导致每个节点能存储的key的数据很小
2. 当存储的数据量很大时，会导致节点增多，B-树的高度变大，磁盘IO次数花费增大，效率降低
3. **查询时间不稳定，离根节点近的查询速度快，离根节点远的查询速度慢**
4. 在B-树上如果做区间查找，遍历的节点是非常多的

![image-20250329012334382](https://images.228610.xyz/2025/03/b8f687303ed502210e97c846585f49b8.webp)

B+树的特点：

1. **非叶子节点只存储索引，不会存储数据**，意味着一个节点包含的索引更多，索引树的节点更少，层数更少，磁盘IO次数更少
2. **索引的数据都放在叶子节点并使用链表串起来，是一个有序链表，查询时会通过索引定位数据起始的位置，查询时间更稳定**
3. 由于数据都被串成一个有序链表，所以在范围收缩时，只需要根据索引树定位起始节点，便可以直接遍历链表获取数据，比B树更加高效

###### 8、创建索引的坑！

 存在问题，我自己查询的时候,extra字段全部都是using where，并不像图中那样显示using index 或者null

 ```sql
 mysql> show create table student\G
 *************************** 1. row ***************************
        Table: student
 Create Table: CREATE TABLE `student` (
   `uid` int unsigned NOT NULL AUTO_INCREMENT,
   `name` varchar(50) NOT NULL,
   `age` tinyint unsigned NOT NULL,
   `sex` enum('M','W') NOT NULL,
   PRIMARY KEY (`uid`),
   KEY `name_index` (`name`(20))
 ) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
 1 row in set (0.07 sec)
 
 mysql> select name from student where name='zhangsan';
 +----------+
 | name     |
 +----------+
 | zhangsan |
 +----------+
 1 row in set (0.03 sec)
 
 mysql> explain select name from student where name='zhangsan';#为什么没有使用到索引，Using index?
 +----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
 | id | select_type | table   | partitions | type | possible_keys | key        | key_len | ref   | rows | filtered | Extra       |
 +----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
 |  1 | SIMPLE      | student | NULL       | ref  | name_index    | name_index | 82      | const |    1 |   100.00 | Using where |
 +----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
 1 row in set, 1 warning (0.00 sec)
 
 mysql> explain select age,name from student where name='zhangsan';#为什么extra不为null
 +----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
 | id | select_type | table   | partitions | type | possible_keys | key        | key_len | ref   | rows | filtered | Extra       |
 +----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
 |  1 | SIMPLE      | student | NULL       | ref  | name_index    | name_index | 82      | const |    1 |   100.00 | Using where |
 +----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
 1 row in set, 1 warning (0.00 sec)
 
 mysql> explain select name from student;#离谱，为什么没有使用到索引
 +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------+
 | id | select_type | table   | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra |
 +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------+
 |  1 | SIMPLE      | student | NULL       | ALL  | NULL          | NULL | NULL    | NULL |    5 |   100.00 | NULL  |
 +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------+
 1 row in set, 1 warning (0.00 sec)
 ```

问题出现的原因：

查询字段与索引不匹配,我们是这么创建索引的

```sql
create index name_index on student(name(20))
```

我们为name的索引设置了长度，这是一个`前缀索引`，前缀索引意味着我们这个索引并不全！它只对 `name` 列的前 20 个字符进行了索引,并没有索引完整的 `name` 列,因此，MySQL 没有使用该索引来加速查询。

所以我们应该这么设置索引,不应该设置索引的长度

```sql
create index name_index on student(name)
```

最终结果

```sql
mysql> show create table student\G
*************************** 1. row ***************************
       Table: student
Create Table: CREATE TABLE `student` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `age` tinyint unsigned NOT NULL,
  `sex` enum('M','W') NOT NULL,
  PRIMARY KEY (`uid`),
  KEY `name_index` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.06 sec)

mysql> select name from student where name='zhangsan';
+----------+
| name     |
+----------+
| zhangsan |
+----------+
1 row in set (0.02 sec)

mysql> explain select name from student where name='zhangsan';
+----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
| id | select_type | table   | partitions | type | possible_keys | key        | key_len | ref   | rows | filtered | Extra       |
+----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
|  1 | SIMPLE      | student | NULL       | ref  | name_index    | name_index | 202     | const |    1 |   100.00 | Using index |
+----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------------+
1 row in set, 1 warning (0.01 sec)

mysql> explain select age,name from student where name='zhangsan';#age不在二级索引树上，产生了回表，extra为null
+----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------+
| id | select_type | table   | partitions | type | possible_keys | key        | key_len | ref   | rows | filtered | Extra |
+----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------+
|  1 | SIMPLE      | student | NULL       | ref  | name_index    | name_index | 202     | const |    1 |   100.00 | NULL  |
+----+-------------+---------+------------+------+---------------+------------+---------+-------+------+----------+-------+
1 row in set, 1 warning (0.00 sec)

mysql> explain select name from student;
+----+-------------+---------+------------+-------+---------------+------------+---------+------+------+----------+-------------+
| id | select_type | table   | partitions | type  | possible_keys | key        | key_len | ref  | rows | filtered | Extra       |
+----+-------------+---------+------------+-------+---------------+------------+---------+------+------+----------+-------------+
|  1 | SIMPLE      | student | NULL       | index | NULL          | name_index | 202     | NULL |    5 |   100.00 | Using index |
+----+-------------+---------+------------+-------+---------------+------------+---------+------+------+----------+-------------+
1 row in set, 1 warning (0.01 sec)

mysql>
```

###### 11、联合索引

```sql
mysql> show create table student\G
*************************** 1. row ***************************
       Table: student
Create Table: CREATE TABLE `student` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `age` tinyint unsigned NOT NULL,
  `sex` enum('M','W') NOT NULL,
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)

mysql> select * from student where age = 20 order by name;
+-----+---------+-----+-----+
| uid | name    | age | sex |
+-----+---------+-----+-----+
|   2 | gaoyang |  20 | W   |
|   6 | weiwie  |  20 | M   |
+-----+---------+-----+-----+
2 rows in set (0.01 sec)

mysql> explain select * from student where age = 20 order by name;
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------------------+
| id | select_type | table   | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra                       |
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------------------+
|  1 | SIMPLE      | student | NULL       | ALL  | NULL          | NULL | NULL    | NULL |    5 |    20.00 | Using where; Using filesort |
+----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-----------------------------+
1 row in set, 1 warning (0.00 sec)

mysql>
```

如何优化上面的查询场景

1. 首先，我们是对age进行查询，所以试着给age添加一个索引

    ```sql
    mysql> create index age_index on student(age);
    Query OK, 0 rows affected (0.12 sec)
    Records: 0  Duplicates: 0  Warnings: 0
    
    mysql> explain select * from student where age = 20 order by name;
    +----+-------------+---------+------------+------+---------------+-----------+---------+-------+------+----------+----------------+
    | id | select_type | table   | partitions | type | possible_keys | key       | key_len | ref   | rows | filtered | Extra          |
    +----+-------------+---------+------------+------+---------------+-----------+---------+-------+------+----------+----------------+
    |  1 | SIMPLE      | student | NULL       | ref  | age_index     | age_index | 1       | const |    2 |   100.00 | Using filesort |
    +----+-------------+---------+------------+------+---------------+-----------+---------+-------+------+----------+----------------+
    1 row in set, 1 warning (0.01 sec)
    
    mysql>
    ```

    发现使用了索引，但是还是存在using filesort，这该如何解决

2. 由于**一次查询只能用到一个索引**，所以使用联合索引,为age和name创建联合索引,这里将age放在前面，这是因为我们先对age查询，如果将name放在前边，则达不到效果

    ```sql
    mysql> drop index age_index on student;
    Query OK, 0 rows affected (0.06 sec)
    Records: 0  Duplicates: 0  Warnings: 0
    
    mysql> create index age_name_index on student(age,name);
    Query OK, 0 rows affected (0.08 sec)
    Records: 0  Duplicates: 0  Warnings: 0
    
    mysql> explain select * from student where age = 20 order by name;
    +----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------+
    | id | select_type | table   | partitions | type | possible_keys  | key            | key_len | ref   | rows | filtered | Extra |
    +----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------+
    |  1 | SIMPLE      | student | NULL       | ref  | age_name_index | age_name_index | 1       | const |    2 |   100.00 | NULL  |
    +----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------+
    1 row in set, 1 warning (0.00 sec)
    
    mysql>
    ```

    成功取消using filesort,这是在构建索引树时就已经对name排序了

    ```sql
    mysql> explain select name,age from student where name = 'zhangsan' order by age;
    +----+-------------+---------+------------+-------+----------------+----------------+---------+------+------+----------+--------------------------+
    | id | select_type | table   | partitions | type  | possible_keys  | key            | key_len | ref  | rows | filtered | Extra                    |
    +----+-------------+---------+------------+-------+----------------+----------------+---------+------+------+----------+--------------------------+
    |  1 | SIMPLE      | student | NULL       | index | age_name_index | age_name_index | 203     | NULL |    5 |    20.00 | Using where; Using index |
    +----+-------------+---------+------------+-------+----------------+----------------+---------+------+------+----------+--------------------------+
    1 row in set, 1 warning (0.01 sec)
    
    mysql> explain select * from student where name = 'zhangsan';#未使用到索引
    +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------------+
    | id | select_type | table   | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra       |
    +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------------+
    |  1 | SIMPLE      | student | NULL       | ALL  | NULL          | NULL | NULL    | NULL |    5 |    20.00 | Using where |
    +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------------+
    1 row in set, 1 warning (0.00 sec)
    
    mysql> explain select * from student where age = 20;#使用到索引，但存在回表
    +----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------+
    | id | select_type | table   | partitions | type | possible_keys  | key            | key_len | ref   | rows | filtered | Extra |
    +----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------+
    |  1 | SIMPLE      | student | NULL       | ref  | age_name_index | age_name_index | 1       | const |    2 |   100.00 | NULL  |
    +----+-------------+---------+------------+------+----------------+----------------+---------+-------+------+----------+-------+
    1 row in set, 1 warning (0.01 sec)
    
    mysql>
    ```
    
    只使用name无法使用索引,而使用age可以使用索引，`所以索引的先后很重要的！`
    
    
    

###### 12、like,not in,or

有些资料提示like,not in这些用不到索引，实际上，经过MySQL的优化后，还是能使用索引的

1. like

    ```sql
    mysql> select * from student where name like 'zhang%';
    +-----+----------+-----+-----+
    | uid | name     | age | sex |
    +-----+----------+-----+-----+
    |   1 | zhangsan |  18 | M   |
    +-----+----------+-----+-----+
    1 row in set (0.00 sec)
    
    mysql> explain select * from student where name like 'zhang%';#这里使用前缀索引进行索引查找
    +----+-------------+---------+------------+-------+---------------+------------+---------+------+------+----------+-----------------------+
    | id | select_type | table   | partitions | type  | possible_keys | key        | key_len | ref  | rows | filtered | Extra                 |
    +----+-------------+---------+------------+-------+---------------+------------+---------+------+------+----------+-----------------------+
    |  1 | SIMPLE      | student | NULL       | range | name_index    | name_index | 202     | NULL |    1 |   100.00 | Using index condition |
    +----+-------------+---------+------------+-------+---------------+------------+---------+------+------+----------+-----------------------+
    1 row in set, 1 warning (0.02 sec)
    
    mysql> explain select * from student where name like '%zhang%';#无法使用前缀索引进行查找，无法使用索引
    +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------------+
    | id | select_type | table   | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra       |
    +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------------+
    |  1 | SIMPLE      | student | NULL       | ALL  | NULL          | NULL | NULL    | NULL |    5 |    20.00 | Using where |
    +----+-------------+---------+------------+------+---------------+------+---------+------+------+----------+-------------+
    1 row in set, 1 warning (0.00 sec)
    
    mysql>
    ```

2. not in

    ```sql
    mysql> create index age_index on student(age);
    Query OK, 0 rows affected (0.18 sec)
    Records: 0  Duplicates: 0  Warnings: 0
    
    mysql> select * from student where age not in(18,20);
    +-----+----------+-----+-----+
    | uid | name     | age | sex |
    +-----+----------+-----+-----+
    |   5 | liuxiang |  19 | W   |
    |   4 | linfeng  |  21 | W   |
    |   3 | chenwei  |  22 | M   |
    +-----+----------+-----+-----+
    3 rows in set (0.00 sec)
    
    mysql> explain select * from student where age not in(18,20);
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+-----------------------+
    | id | select_type | table   | partitions | type  | possible_keys | key       | key_len | ref  | rows | filtered | Extra                 |
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+-----------------------+
    |  1 | SIMPLE      | student | NULL       | range | age_index     | age_index | 1       | NULL |    4 |   100.00 | Using index condition |
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+-----------------------+
    1 row in set, 1 warning (0.01 sec)
    
    mysql> explain select age from student where age not in(18,20);
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+--------------------------+
    | id | select_type | table   | partitions | type  | possible_keys | key       | key_len | ref  | rows | filtered | Extra                    |
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+--------------------------+
    |  1 | SIMPLE      | student | NULL       | range | age_index     | age_index | 1       | NULL |    4 |   100.00 | Using where; Using index |
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+--------------------------+
    1 row in set, 1 warning (0.00 sec)
    
    mysql>
    ```

 3. or

    ```cpp
    mysql> explain select age from student where age <18 or age > 20;
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+--------------------------+
    | id | select_type | table   | partitions | type  | possible_keys | key       | key_len | ref  | rows | filtered | Extra                    |
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+--------------------------+
    |  1 | SIMPLE      | student | NULL       | range | age_index     | age_index | 1       | NULL |    3 |   100.00 | Using where; Using index |
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+--------------------------+
    1 row in set, 1 warning (0.00 sec)
    
    mysql> explain select * from student where age <18 or age > 20;
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+-----------------------+
    | id | select_type | table   | partitions | type  | possible_keys | key       | key_len | ref  | rows | filtered | Extra                 |
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+-----------------------+
    |  1 | SIMPLE      | student | NULL       | range | age_index     | age_index | 1       | NULL |    3 |   100.00 | Using index condition |
    +----+-------------+---------+------------+-------+---------------+-----------+---------+------+------+----------+-----------------------+
    1 row in set, 1 warning (0.00 sec)
    
    mysql>
    ```


###### 13、Innodb自适应哈希索引

 我们知道，在使用二级索引树的时候，可能会产生回表。**当某些查询频繁访问二级索引且模式固定（如 `WHERE name = 'zhangsan'` 的查询），InnoDB 会在内存中基于 B+ 树的二级索引创建一个哈希索引。自适应哈希索引的作用是加速特定查询，避免二级索引树和主键索引树的回表过程。**

 一般情况下，二级索引会先查询二级索引树，如果二级索引树无法满足，就会到主键索引树上查找，这产生了回表，而**如果生成了自适应哈希索引，那么在使用二级索引时，会直接根据哈希索引找到对应的数据页得到数据，跳过了二级索引树和主键索引树的收缩过程。** 

 ![image-20250329015255357](https://images.228610.xyz/2025/03/1d2f9b4c24cff3c70ffbcd7da60cd019.webp)   

 当然，自适应哈希索引并不是所有情况都能提高速度，因为`自适应哈希索引的维护也是需要消耗性能的`，当达到一定的数据量时，并不一定能提高速度，所以需要根据实际情况开关。如果很多线程经常阻塞在哈希索引锁上，就应该视情况关闭自适应哈希索引

 - 查看自适应哈希索引是否打开

     ```sql
      show variables like 'innodb_adaptive_hash_index'
     ```

     ```sql
     mysql> show variables like 'innodb_adaptive_hash_index';
     +----------------------------+-------+
     | Variable_name              | Value |
     +----------------------------+-------+
     | innodb_adaptive_hash_index | ON    |
     +----------------------------+-------+
     1 row in set (0.62 sec)
     ```

 - 查看自适应哈希索引的分区,每一个分区有自己的一把锁

     ```sql
     show variables like 'innodb_adaptive_hash_index_parts'
     ```

     ```sql
     mysql> show variables like 'innodb_adaptive_hash_index_parts';
     +----------------------------------+-------+
     | Variable_name                    | Value |
     +----------------------------------+-------+
     | innodb_adaptive_hash_index_parts | 8     |
     +----------------------------------+-------+
     1 row in set (0.01 sec)

     mysql>
     ```

 - 查看自适应哈希索引使用情况

     ```sql
     show engine innodb status\G
     ```

     ```sql
     mysql> show engine innodb status\G
     *************************** 1. row ***************************
       Type: InnoDB
       Name:
     Status:
     =====================================
     2024-11-21 02:29:15 123599813867200 INNODB MONITOR OUTPUT
     =====================================
     Per second averages calculated from the last 2 seconds
     -----------------
     BACKGROUND THREAD
     -----------------
     srv_master_thread loops: 8 srv_active, 0 srv_shutdown, 18035 srv_idle
     srv_master_thread log flush and writes: 0
     ----------
     SEMAPHORES
     ----------
     OS WAIT ARRAY INFO: reservation count 69
     OS WAIT ARRAY INFO: signal count 65
     RW-shared spins 0, rounds 0, OS waits 0
     RW-excl spins 0, rounds 0, OS waits 0
     RW-sx spins 0, rounds 0, OS waits 0
     Spin rounds per wait: 0.00 RW-shared, 0.00 RW-excl, 0.00 RW-sx
     ------------
     TRANSACTIONS
     ------------
     Trx id counter 4020774
     Purge done for trx's n:o < 4020771 undo n:o < 0 state: running but idle
     History list length 0
     LIST OF TRANSACTIONS FOR EACH SESSION:
     ---TRANSACTION 405074790583512, not started
     0 lock struct(s), heap size 1128, 0 row lock(s)
     ---TRANSACTION 405074790582704, not started
     0 lock struct(s), heap size 1128, 0 row lock(s)
     ---TRANSACTION 405074790581896, not started
     0 lock struct(s), heap size 1128, 0 row lock(s)
     --------
     FILE I/O
     --------
     I/O thread 0 state: waiting for completed aio requests (insert buffer thread)
     I/O thread 1 state: waiting for completed aio requests (read thread)
     I/O thread 2 state: waiting for completed aio requests (read thread)
     I/O thread 3 state: waiting for completed aio requests (read thread)
     I/O thread 4 state: waiting for completed aio requests (read thread)
     I/O thread 5 state: waiting for completed aio requests (write thread)
     I/O thread 6 state: waiting for completed aio requests (write thread)
     I/O thread 7 state: waiting for completed aio requests (write thread)
     I/O thread 8 state: waiting for completed aio requests (write thread)
     Pending normal aio reads: [0, 0, 0, 0] , aio writes: [0, 0, 0, 0] ,
     ibuf aio reads:
    Pending flushes (fsync) log: 0; buffer pool: 0
    1306 OS file reads, 705 OS file writes, 321 OS fsyncs
    0.00 reads/s, 0 avg bytes/read, 0.00 writes/s, 0.00 fsyncs/s
    -------------------------------------
    INSERT BUFFER AND ADAPTIVE HASH INDEX
    -------------------------------------
    Ibuf: size 1, free list len 0, seg size 2, 0 merges
    merged operations:
     insert 0, delete mark 0, delete 0
    discarded operations:
     insert 0, delete mark 0, delete 0
    Hash table size 34679, node heap has 3 buffer(s)
    Hash table size 34679, node heap has 0 buffer(s)
    Hash table size 34679, node heap has 0 buffer(s)
    Hash table size 34679, node heap has 1 buffer(s)
    Hash table size 34679, node heap has 0 buffer(s)
    Hash table size 34679, node heap has 0 buffer(s)
    Hash table size 34679, node heap has 0 buffer(s)
    Hash table size 34679, node heap has 0 buffer(s)
    0.00 hash searches/s, 0.00 non-hash searches/s
    ---
    LOG
    ---
    Log sequence number          1666873789
    Log buffer assigned up to    1666873789
    Log buffer completed up to   1666873789
    Log written up to            1666873789
    Log flushed up to            1666873789
    Added dirty pages up to      1666873789
    Pages flushed up to          1666873789
    Last checkpoint at           1666873789
    Log minimum file id is       508
    Log maximum file id is       509
    286 log i/o's done, 0.00 log i/o's/second
    ----------------------
    BUFFER POOL AND MEMORY
    ----------------------
    Total large memory allocated 0
    Dictionary memory allocated 536507
    Buffer pool size   8191
    Free buffers       6788
    Database pages     1399
    Old database pages 497
    Modified db pages  0
    Pending reads      0
    Pending writes: LRU 0, flush list 0, single page 0
    Pages made young 184, not young 492
    0.00 youngs/s, 0.00 non-youngs/s
    Pages read 1257, created 143, written 327
    0.00 reads/s, 0.00 creates/s, 0.00 writes/s
    No buffer pool page gets since the last printout
    Pages read ahead 0.00/s, evicted without access 0.00/s, Random read ahead 0.00/s
    LRU len: 1399, unzip_LRU len: 0
    I/O sum[0]:cur[0], unzip sum[0]:cur[0]
    --------------
    ROW OPERATIONS
    --------------
    0 queries inside InnoDB, 0 queries in queue
    0 read views open inside InnoDB
    Process ID=1526, Main thread ID=123599193114304 , state=sleeping
    Number of rows inserted 0, updated 0, deleted 0, read 0
    0.00 inserts/s, 0.00 updates/s, 0.00 deletes/s, 0.00 reads/s
    Number of system rows inserted 47, updated 331, deleted 45, read 5318
    0.00 inserts/s, 0.00 updates/s, 0.00 deletes/s, 0.00 reads/s
    ----------------------------
    END OF INNODB MONITOR OUTPUT
    ============================
                
    1 row in set (0.06 sec)
                
    mysql>
    ```

    其中有两个重要参数：

    - RW-latch: 等待的线程数量（自适应哈希索引默认分配了8个分区），同一个分区等待的线程数量过多,下面并没有显示RW-latch,如果等待线程过多，应该关闭自适应哈希索引
    
        ```sql
        ----------
        SEMAPHORES
        ----------
        OS WAIT ARRAY INFO: reservation count 69
        OS WAIT ARRAY INFO: signal count 65
        RW-shared spins 0, rounds 0, OS waits 0
        RW-excl spins 0, rounds 0, OS waits 0
        RW-sx spins 0, rounds 0, OS waits 0
        Spin rounds per wait: 0.00 RW-shared, 0.00 RW-excl, 0.00 RW-sx
        ```
    
    - 自适应哈希索引的使用情况
    
        ```sql
        INSERT BUFFER AND ADAPTIVE HASH INDEX
        ```
    
        ```sql
        -------------------------------------
        INSERT BUFFER AND ADAPTIVE HASH INDEX
        -------------------------------------
        Ibuf: size 1, free list len 0, seg size 2, 0 merges
        merged operations:
         insert 0, delete mark 0, delete 0
        discarded operations:
         insert 0, delete mark 0, delete 0
        Hash table size 34679, node heap has 3 buffer(s)
        Hash table size 34679, node heap has 0 buffer(s)
        Hash table size 34679, node heap has 0 buffer(s)
        Hash table size 34679, node heap has 1 buffer(s)
        Hash table size 34679, node heap has 0 buffer(s)
        Hash table size 34679, node heap has 0 buffer(s)
        Hash table size 34679, node heap has 0 buffer(s)
        Hash table size 34679, node heap has 0 buffer(s)
        0.00 hash searches/s, 0.00 non-hash searches/s
        ---
        ```
    
        这里显示查询结果`使用哈希索引和没有使用哈希索引的使用比例`，如果哈希索引使用较少，应该视情况关闭自适应哈希索引，如果自适应哈希索引使用较多，则确实达到了加速效果。
