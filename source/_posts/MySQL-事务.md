title: MySQL-事务
date: 2025-03-28 18:08:00
categories: 数据库
tags: [MySQL]
---
### 一、基本概念

一个事务是由一条或者多条对数据库操作的SQL语句所组成的一个不可分割的单元，只有当事务中的所 有操作都正常执行完了，整个事务才会被提交给数据库；如果有部分事务处理失败，那么事务就要回退 到最初的状态，因此，事务要么全部执行成功，要么全部失败。`可以将事务理解为一个原子操作，事务中的任务是不可分割的`,事务执行过程中，有的SQL出现错误，那么事务必须要回滚（rollback）到最初的状态;事务的所有SQL语句全部执行成功，才能提交（commit）事务，把结果写回磁盘上。

### 二、相关知识

1. MyISAM存储引擎是不支持事务的

2. InnoDB存储引擎支持事务，同时支持行锁

3. 查询MySQL事务的提交状态

    ```sql
    select @@autocommit;
    ```

    ```sql
    mysql> select @@autocommit;
    +--------------+
    | @@autocommit |
    +--------------+
    |            1 |
    +--------------+
    1 row in set (0.01 sec)
    ```

    1表示自动提交，一般我们需要设置为0，改为手动提交

    ```sql
    set autocommit = 0;
    ```

    ```sql
    mysql> set autocommit = 0;
    Query OK, 0 rows affected (0.01 sec)
    
    mysql> select @@autocommit;
    +--------------+
    | @@autocommit |
    +--------------+
    |            0 |
    +--------------+
    1 row in set (0.00 sec)
    
    mysql>
    ```

4. 事务处理：

    1. BEGIN; 开启一个事务
    2. COMMIT; 提交一个事务
    3. ROLLBACK; 回滚一个事务到初始的位置
    4. SAVEPOINT point1; 设置一个名字为point1的保存点
    5. ROLLBACK TO point1; 事务回滚到保存点point1，而不是回滚到初始状态

### 三、事务的ACID特性

1. 事务的原子性（Atomic）

    事务是一个不可分割的整体，事务必须具有原子特性，及当数据修改时，要么全执行，要么全不执行， 即不允许事务部分的完成。

2. 事务的一致性（Consistency）

    一个事务执行之前和执行之后，数据库数据必须保持一致性状态。数据库的一致性状态必须由用户来负 责，由并发控制机制实现。就拿网上购物来说，你只有让商品出库，又让商品进入顾客的购物车才能构 成一个完整的事务。

3. 事务的隔离性（Isolation）

    当两个或者多个事务并发执行时，为了保证数据的安全性，将一个事物内部的操作与其它事务的操作隔 离起来，不被其它正在执行的事务所看到，使得并发执行的各个事务之间不能互相影响。

4. 事务的持久性（Durability）

    事务完成(commit)以后，`DBMS`保证它对数据库中的数据的修改是永久性的，即使数据库因为故障出 错，也应该能够恢复数据！

    这里有一个场景：

    > 事务commit以后直接就返回了，但此时数据并不是真的写入到了磁盘中，这些数据还在内存中（脏数据），因为写入数据涉及到磁盘IO，时间较长，commit不会等待，但是如果在从内存写入磁盘的这一过程中，出现停电，重启等问题，那么如何保证数据的可恢复呢？MySQL的`redo log`和`undo log`机制解决了这一问题,这一机制保证了数据的持久性，所有说MySQL数据库重经典的一句话就是：MySQL最重要的不是数据，而是日志！
    >
    > 事务的ACID特性：
    >
    > ACD:由MySQL的redo log和undo log机制保证
    >
    > I:由MySQL事务的锁机制保证

### 四、事务并发存在的问题

1. **脏读（Dirty Read）**：`一个事务读取了另一个事务未提交的数据`。例如当事务A和事务B并发执行时，当 事务A更新后，事务B查询读取到A尚未提交的数据，此时事务A回滚，则事务B读到的数据就是无效的脏 数据。（`事务B能够读取事务A尚未提交的数据`）,`脏读一定是不被允许的。`
2. **不可重复读（NonRepeatable Read）**：`一个事务的操作导致另一个事务前后两次读取到不同的数据。` 例如当事务A和事务B并发执行时，当事务B查询读取数据后，事务A更新操作更改事务B查询到的数据， 此时事务B再次去读该数据，发现前后两次读的数据不一样（`事务B能够读取事务A已提交的数据，换句话说就是其他事务完成的操作能够影响到当前事务`）。`没有错误，可以接受，但是需要视业务而定`
3. **虚读（Phantom Read）幻读**：`一个事务的操作导致另一个事务前后两次查询的结果数据量不同`。例如 当事务A和事务B并发执行时，当事务B查询读取数据后，事务A新增或者删除了一条满足事务B查询条件 的记录，此时事务B再去查询，发现查询到前一次不存在的记录，或者前一次查询的一些记录不见了。 （事务B读取了事务A新增加的数据或者读不到事务A删除的数据）`没有错误，可以接受，但是需要视业务而定`

#### 1、事务的隔离级别

1. `READ-UNCOMMITTED`。未提交读。说明在提交前一个事务可以看到另一个事务 的变化。这样读脏数据，不可重复读和虚读都是被允许的。
2. `READ-COMMITTED`。已提交读。说明读取未提交的数据是不允许的。这个级别仍然允许不可重复读和虚读产生
3. `REPEATABLE-READ`。可重复读。说明事务保证能够再次读取相同的数据而不会失败，但虚读仍然会出现。
4. `SERIALIZABLE`。串行化。是最高的事务级别，它防止读脏数据，不可重复读和虚读。(单线程执行)

| 隔离级别 | 脏读   | 不可重复读 | 幻读                                          |
| -------- | ------ | ---------- | --------------------------------------------- |
| 未提交读 | 可以   | 可以       | 可以                                          |
| 已提交读 | 不可以 | 可以       | 可以                                          |
| 可重复读 | 不可以 | 不可以     | 可以(可以防止delete和insert,但无法防止update) |
| 串行化   | 不可以 | 不可以     | 不可以                                        |

> 1. 事务隔离级别越高，为避免冲突所花费的性能也就越多。
> 2. 在“可重复读”级别，实际上可以解决部分的虚读问题，但是不能防止update更新产生的虚读问题，要禁 止虚读产生，还是需要设置串行化隔离级别。

- 设置隔离级别：

    ```sql
    SET GLOBAL transaction_isolation = 'REPEATABLE-READ'; -- 示例：全局设置为可重复读,可能需要断开重连才能生效
    SET SESSION transaction_isolation = 'READ-COMMITTED'; -- 示例：当前会话设置为已提交读
    ```

    

- 查询事务的隔离级别

    ```sql
    SELECT @@transaction_isolation;#MySQL 8.0
    select @@tx_isolation;#MySQL 5.7
    ```

    ```sql
mysql> SELECT @@transaction_isolation;
    +-------------------------+
    | @@transaction_isolation |
    +-------------------------+
    | REPEATABLE-READ         |
    +-------------------------+
    1 row in set (0.03 sec)
    
    mysql>
    ```
    
    MySQL默认隔离级别为` REPEATABLE-READ `,只允许虚读产生，不允许脏读和不可重复读

- 查看全局隔离级别,可能需要断开重连才能生效

    ```sql
    SHOW GLOBAL VARIABLES LIKE 'transaction_isolation';
    ```



#### 1、READ_UMCOMMIT

![PixPin_2024-11-21_16-42-42](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-11-21_16-42-42.png) 

首先，我们先执行在右边执行查询数据

```cpp
 select * from student where name = 'zhangsan';
```

再从左边修改数据

```cpp
 update student set age = 19 where name = 'zhangsan';
```

最后在右边再次查询

```cpp
 select * from student where name = 'zhangsan';
```

发现数据发生了脏读，右边的事务读取到了左边尚未完成事务的数据,如果左边事务发生错误，就会导致数据错误！

#### 2、READ-COMMITTED

![PixPin_2024-11-21_16-56-43](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-11-21_16-56-43.png) 

从上面可知，在左边事务未commit之前，右边是无法查看修改的数据的，在左边事务commit后，右边即可查看,`但存在不可重复读的情况，即其他事务提交后当前事务可以访问到变化后的数据。`

#### 3、REPEATABLE-READ

![PixPin_2024-11-21_17-09-59](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-11-21_17-09-59.png) 

可以看见，在可重复读级别下，其他事务提交的数据无法影响到当前事务,读取的数据都是相同的。

![PixPin_2024-11-21_17-18-29](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-11-21_17-18-29.png) 

可以发现，可重复读在一定程度上能够防止幻读的发生，但只能防止insert和delete，无法防止update

![PixPin_2024-11-21_17-30-14](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-11-21_17-30-14.png)  

我们发现，虽然我们第七步使用select查询不到bbb这个人，但是我们还是能够对其修改，经过修改以后，能够查询到这个人，所以前后结果数量不一致，导致虚读发生。

#### 4、SERIALIZABLE

![PixPin_2024-11-21_17-40-29](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-11-21_17-40-29.png) 

可以发现，在插入时已经阻塞住了，无法执行写操作。

