title: MySQL-阻塞问题排查
date: 2025-03-30 09:14:00
categories: 问题汇总
tags: [MySQL]
---
这里以解决**`DROP INDEX` 阻塞** 的问题为例：

### **1. 确认问题背景**

1. **操作内容**：`DROP INDEX` 需要获取 **表级独占锁**，可能被其他事务或连接阻塞。
2. 常见原因：
    - 未提交的事务持有表的共享锁或意向锁。
    - 长时间运行的查询或未关闭的连接阻塞表操作。
    - 高隔离级别（如 `SERIALIZABLE`）增加了锁的持有范围。

### **2. 检查锁和连接状态**

#### 2.1 检查当前活跃的连接和状态

执行以下命令，查看是否有阻塞的事务或长时间 `Sleep` 的连接：

```sql
SHOW PROCESSLIST;
```

- 关注重点：
    - `Command` 列显示 `Sleep` 或 `Query` 的连接。
    - `State` 列中是否有 `Locked` 或 `Waiting for table metadata lock`。
    - `Time` 列中时间较长的连接可能是问题的来源。

例如：

![PixPin_2024-11-26_17-15-18](https://hmleadnews-terminal.oss-cn-beijing.aliyuncs.com/images/PixPin_2024-11-26_17-15-18.png) 

#### 2.2 查看锁的详细信息

使用以下命令检查 `InnoDB` 锁的状态：

```sql
SHOW ENGINE INNODB STATUS\G;
```

- 重点部分：
    - **TRANSACTIONS**：查看哪些事务持有锁或导致锁等待。
    - **LOCK WAIT**：查看具体锁的类型和影响的表。

------

### **3. 检查是否有未提交的事务**

1. 确认当前是否有未提交的事务：

    ```sql
    SELECT * FROM information_schema.innodb_trx\G;
    ```

    - **`trx_state` = `LOCK WAIT`**：事务正在等待锁。
    - **`trx_started` 时间**：长时间运行的事务可能是问题的来源。

2. **解决方法**：

    - 提交事务：

        ```sql
        COMMIT;
        ```

    - 或回滚事务：

        ```sql
        ROLLBACK;
        ```

### **4. 终止无效的连接**

对于长时间处于 `Sleep` 状态或导致阻塞的连接，可以使用以下步骤终止：

1. 找到连接 ID：

    ```sql
    SHOW PROCESSLIST;
    ```

2. 使用 `KILL`命令终止：

    ```sql
    KILL [connection_id];
    ```

### **5. 降低隔离级别**

高隔离级别（如 `SERIALIZABLE`）可能会对表范围加锁，阻止其他事务进行操作。

1. 将隔离级别调整为 

    ```sql
    REPEATABLE READ
    ```

     或更低：

    ```sql
    SET GLOBAL TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    ```

2. 如果事务中设置了 `AUTOCOMMIT = 0`，确认是否可以使用更低的隔离级别完成操作。



### **6. 尝试释放表级锁**

如果表被 `metadata lock` 阻塞，可以尝试以下方法：

1. 查看 information_schema 中的锁信息：

    ```sql
    SELECT * FROM information_schema.metadata_locks\G
    ```

    1. 终止相关会话或操作。

------

### **7. 再次尝试删除索引**

清理阻塞后，重新执行删除索引的操作：

```sql
DROP INDEX name_index ON user;
```

------

### **总结排查步骤**

1. 检查连接和事务状态：
    - 使用 `SHOW PROCESSLIST` 和 `SHOW ENGINE INNODB STATUS\G` 找出阻塞的连接或事务。
    - 找到长时间运行或未提交的事务。
2. 清理阻塞连接：
    - 使用 `KILL` 终止不必要的连接。
3. 调整隔离级别：
    - 降低隔离级别到 `REPEATABLE READ` 或更低，减少锁冲突。
4. 提交或回滚事务：
    - 提交或回滚可能占用资源的事务。
5. 删除索引：
    - 确认所有锁释放后，执行 `DROP INDEX`。