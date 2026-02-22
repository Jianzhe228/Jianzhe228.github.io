title: MySQL数据库无法插入中文解决
date: 2025-03-30 09:09:00
categories: 问题汇总
tags: [MySQL]
---
# MySQL数据库无法插入中文解决

## 一、数据库修改



> 先修改数据库的字符集编码

```sql
ALTER DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> 再修改表的字符集编码

```sql
ALTER TABLE your_table_name CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```



## **二、配置 IntelliJ IDEA 的数据库连接：**

> 设置连接的编码格式 mybatis操作数据库配置文件

```java
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.url=jdbc:mysql://localhost:3306/your_database_name?useUnicode=true&characterEncoding=UTF-8
spring.datasource.username=root
spring.datasource.password=your_password
```

