---
title: 51单片机习题整理
date: 2020-11-03T20:19:36+08:00
lastmod: 2020-12-09T12:31:15+08:00
layout: post
tags:
- 单片机
- 学习资料
categories:
- 学习资料
- 单片机
---

赶在~~期中考试~~(骑磨烤柿)前把单片机的课后习题整理出来...

(实在是没什么可拿来更新博客的了, 就干脆写点复习资料吧...)

<!--more-->

------

> 本篇内容为作者整理资料所得, 仅供学习使用。如需转载请务必遵循CC BY-NC-ND 4.0协议。
> 请勿将本篇内容作为权威的教学辅导资料使用, 因无法保证100%准确, 仅供参考。
>
> 如果发现了本篇存在的错误, 欢迎在页面下方提issue指正。
>
> 本篇文章使用MathJax显示数学公式，在使用RSS阅读器时会出现无法正确显示的情况。

{{< music netease song 1429420739 >}}

## 硬件结构&指令系统

1. 8051复位后从地址`0000H`开始执行程序, SP的值为`07H`。

   PC: 两字节(16位)寄存器, 也称程序计数器。

   SP: 堆栈指针, 指示出堆栈顶部在**内部RAM块**中的位置。

   单片机的堆栈设在了内部RAM区, 单片机复位后, SP中的内容为`07H`(指向第0组工作寄存器的R7), 堆栈实际上从`08H`开始。

   若SP被初始化为`39H`, 则堆栈实际上是从`3AH`开始的。

   执行`LCALL addr16`指令时，单片机先将PC的低字节压栈，再将PC的高字节压栈，最后把转移地址送入PC中。

   与之类似的`LJMP`类无条件转移指令，单片机只修改PC的值，并不堆栈保存跳转前的PC中保存的地址。

   执行`RET`指令后, SP值减2 (因为PC为2字节寄存器), 进行两次出栈操作，第一次出栈送PC的高位，第二次出栈送PC的低位。

   中断服务程序结束指令`RETI`不仅将堆栈中保存的2字节地址分别送入PC的高位和低位中，而且复位中断系统。因此`RET`和`RETI`不同。

   `RET`和`RETI`对堆栈的操作是相同的。

2. PSW中的`RS1 RS0`=`10B`时, R2的RAM地址为`12H`。

   PSW： 程序状态字寄存器, 从`PSW.7`至`PSW.0`分别为`Cy`(进位标志位), `Ac`(辅助进位标志位), `F0`(标志位), `RS1`和`RS0`(寄存器区选择控制位), `OV`(溢出位), 保留位, `P`(奇偶标志位, 奇数为1, 偶数为0)。

   | |D7|D6|D5|D4|D3|D2|D1|D0|
   |:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
   |PSW|Cy|Ac|F0|RS1|RS0|OV| |P|

   `RS1 RS0` = `10B`时, 使用第二组工作寄存器区, 第0组工作寄存器区R0-R7的地址为`00H-07H`, 第1组为`08H-0FH`, 第2组为`10H-17H`, 第3组为`18H-1FH`(每组长度为8个字节, 每个寄存器占1个字节)。

   因此, 当A为`01110010B`时, PSW中P为0(偶数个1)。

   `INC A`指令不改变`PSW`中的`Cy`，只有可能改变奇偶标志位`P`。

   假设PSW为`18H`, 即`00011000B`, 此时使用第3组工作寄存器, R0地址为`18H`, R7地址为`1FH`。

   复位后, 默认选择的寄存器区是0区。

3. 8051片外数据存储器的寻址空间为`0000H~0FFFFH`

4. 位地址`07H`位于字节地址`20H`, 位地址`7FH`位于字节地址`2FH`。

   片内RAM中`20H~2FH`这16个单元即可进行共128位的位寻址, 也可进行字节寻址。

   字节地址及其位地址见下表所示：

   |字节地址|D7|D6|D5|D4|D3|D2|D1|D0|
   |:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
   |2FH|7FH|7EH|7DH|7CH|7BH|7AH|79H|78H|
   |2EH|77H|76H|75H|74H|73H|72H|71H|70H|
   |2DH|6FH|6EH|6DH|6CH|6BH|6AH|69H|68H|
   |...|...|...|...|...|...|...|...|...|
   |21H|0FH|0EH|0DH|0CH|0BH|0AH|09H|08H|
   |20H|07H|06H|05H|04H|03H|02H|01H|00H|

   因此`00H~07H`位于字节地址`20H`, `78H-7FH`位于字节地址`2FH`。

   除此之外，一些特殊功能寄存器（SFR）可进行位寻址（字节地址能够被8整除），SFR中位地址有83个（共有88个，5个未用），能够位寻址的SFR的字节地址末位均为`0H`或`8H`。

5. 访问外部存储器时, P0口用来传输低8位地址和数据, P2口用来传送高8位地址。

6. 访问外部存储器时, ALE的输出用于锁存低8位地址。

7. 一个机器周期为12个震荡周期

8. 为保证读入数据正确, 在读一个端口引脚之前应先向相应的端口锁存器写1。

   如果在读一个端口引脚之前向对应的输出锁存器写了0, 将总是读到0。

   8051访问片外存储器时, 利用ALE信号锁存来自P0的低8位地址信号。

9. 只能用直接寻址方式访问特殊功能寄存器。

   如果为8052单片机, 在访问高128字节的RAM时, 只能用间接寻址方式寻址。

   访问片外数据存储器64Kbyte时, 使用`DPTR`做间接寻址寄存器。

   使用`MOVX @DPTR`类指令访问外部扩展存储器时, P2口输出高8位地址, P0口传送低8位地址和数据。

   8051中, `PC`和`DPTR`都用于提供地址时, `PC`是**用户程序不可访问的**, `DPTR`可以分为两个8位寄存器`DPH`和`DPL`使用。

10. 累加器A的值为`30H`, 指令`MOVC A, @A+PC`位于地址`3000H`。执行该指令时, 程序存储器地址`3031H`的内容被传送至累加器A。

   指令`MOVC A, @A+PC`长度为1字节, 位于地址`3000H`, 因此PC值为`3001H`, 故`A+PC`为`3031H`。

11. 设SP的值为`5FH`, 指令`LCALL DELAY`所在地址为`2030H`, 子程序DELAY所在地址为`20A0H`, 则该指令完成的操作是将地址`2033H`压入堆栈保存, 将地址`20A0H`送入PC, SP的值应在该指令执行结束后变成`61H`。

   单片机执行子程序或中断服务程序时, 需要保护现场, 即将PC当前的值压栈保存, 当子程序或中断服务程序运行结束后再进行出栈。(所以如果子程序修改了栈的内容, 在子程序运行结束后程序有可能会运行错误)。

   **PC是16字节寄存器**, 所以SP需要加2, 以此分别保存PC的高、低8位的数据。

   `LCALL addr16`这条指令占3字节, 其中addr16占两字节, 因此程序可跳转64KB范围内的地址。

   (`ACALL`指令只能跳转当前所在的**2K范围内**的地址, 如果不涉及到片外数据存储器的话, 通常只用`SJMP`和`AJMP`)

   > 在网上搜到的答案「将`3500H`送入PC」是错误的, 实际是将`20A0H`送入PC, 因为DELAY所在的地址为`20A0H`, 和`3500H`一点关系都没有。

12. `MOVC`访问 **程序(ROM)** 存储器, `MOVX`指令访问 **外部数据** 存储器。

   `MOVC`为查表指令, 只有`MOVC @A+PC`和`MOVC @A+DPTR`这两条, 均为单字节指令。

   `MOVX`用于累加器A与外部数据存储器进行传送。

   可以是`MOVX A, @DPTR`, `MOVX A, @Ri`, `MOVX @DPTR, A`, `MOVX @Ri, A`，其中i为0或1.

   当使用`MOVX @Ri`类指令时，只有P0口用来传送地址和数据，P2口的状态不会发生改变，因此可使用`MOV P2, #12H`指令设定高8位的地址。

   当采用Ri作间接寻址时, 只能寻找片外256个单元的数据存储器, 此时8位地址和数据均由P0口传送，P2口的状态不发生改变。

13. 假设指令`DJNZ R7, rel`位于`005FH`, 如果在执行该指令前寄存器R7值为`00H`, 偏移量rel为`02H`, 则该指令执行后下一条要执行的指令所在的地址是`005FH`。

   `DJNZ R7, rel`位于`005FH`, 该指令长度为**2字节** (书上写的3字节是错的), 所以在执行这条指令开始时PC值在原来的基础上 + 2 变为`0061H`。又因为rel为`02H`, 所以执行这条指令后, PC值变为`0063H`。

14. 分析下面子程序的功能, 假设8051单片机的震荡频率为6MHz。

   ``` asm
  DL: MOV R7, #0AH
  L0: MOV R6, #250
  L1: NOP
        NOP
        DJNZ R6, L1
        DJNZ R7, L0
        RET
  ```

  R7为10, R6为250, 因此两个`NOP`加上一个`DJNZ`一共循环了250次, 该250次的循环一共执行了10次。

  `NOP`为1周期指令, `DJNZ`为2周期指令, 两个`NOP`加一个`DJNZ`共4周期。

  6MHz下一个机器周期为{{< mathjax/inline >}}\(12 \div (6 \times 10^6)= 2{\mu}s\){{< /mathjax/inline >}}, 12MHz下一个机器周期为1微秒。

  故程序该子程序延时了{{< mathjax/inline >}}\((4 \times 250 \times 10 \times 12) \div (6 \times 10^6) = 20(ms)\){{< /mathjax/inline >}}

  (实际上有10次`MOV R6, #250`和10次`DJNZ R7, L0`造成的30个机器周期的约0.6ms的误差)

-----

> 以下部分写于2020年11月25日

## 汇编语言程序

1. 编写一个子程序, 将内部RAM 40H\~4FH的内容复制到50H\~5FH。

   ``` asm
   COPY: MOV R0, #40H
         MOV R1, #50H
         MOV R2, #10H
         ; 40H~4FH一共复制了16次
   LOOP:
         MOV A, @R0
         MOV @R1, A
         INC R0
         INC R1
         DJNZ R2, LOOP
         RET
   ```

   因为没有`MOV @RX, @RX`这条指令, 所以用A做数据的中转站。

2. 将任何无符号8位二进制数转换为BCD码的子程序, 入口参数为内部RAM单元20H, 出口参数为内部RAM单元30H和31H, 30H存放百位数, 31H存放十位数和个位数。

   ``` asm
   CV:
   MOV R0, #20H
   MOV A, @R0
   MOV B, #100
   DIV AB; A除以100, 得到的百位数存在A中
   MOV 30H, A
   MOV A, B

   MOV B, #10
   DIV AB

   SWAP A
   ADD A, B; 也可以用ORL
   MOV 31H, A
   RET
   ```

   `DIV AB`和`MUL AB`的A和B之间没有逗号。

3. 内部RAM 30H单元存放两位十进制数 (压缩BCD码), 编写将该十进制数转换为对应ASCII码的子程序, 转换结果存放到内部RAM 40H (十位数) 和41H (个位数) 单元。
   > ASCII码： `30H`为`0`, `41H`为`A`, `61H`为`a`

   ``` asm
   CV:
   MOV A, 30H
   ANL A, #0FH
   MOV DPTR, #DATA; 或者直接用ADD A, #30H即可
   MOVC A, @A+DPTR
   MOV 41H, A

   MOV A, 30H
   SWAP A
   ANL A, #0FH
   MOVC A, @A+DPTR
   MOV 40H, A

   RET

   DATA:
   DB 30H, 31H, 32H, 33H, 34H, 35H, 36H, 37H, 38H, 39H
   ```

4. 8个8位数相加, 求平均值, 入口地址为`30H`~`37H`, 结果存到`40H`。

   把8位数相加存在溢出, 所以把相加结果以16进制存到R2、R3中, 再除以8( 右移3次), 即可求得不四舍五入的平均值。

   ``` asm
   MOV R0, #30H
   MOV R1, #08H
   MOV R2, #00H
   MOV R3, #00H
   ; 初始化
   LOOP:
   CLR C
   MOV A, @R0
   ADD A, R3
   MOV R3, A
   JNC SKIP
   INC R2
   SKIP:
   INC R0
   DJNZ R1, LOOP
   ```

   这样结果被保存到R2、R3中, 然后需要写一个循环右移3位的程序。

   ``` asm
   MOV R4, #03H
   LOOP2:
   RRC R2
   RRC R3
   DJNZ R4, LOOP2

   MOV 40H, R3
   ; 右移3次后R2的低4位为0, 结果保存在R3中
   ```

   这样R3中求得的是不带四舍五入的结果。

   如果需要带四舍五入的话第一种方法是判断最后一次右移时最低位是否为{{< mathjax/inline >}}\(1\){{< /mathjax/inline >}}，{{< mathjax/inline >}}\((1 / 2 = 0.5)\){{< /mathjax/inline >}}。

   ``` asm
   MOV R4, #03H
   LOOP2:
   RRC R2
   RRC R3
   DJNZ R4, LOOP2

   JNC SKIP2
   INC R3
   SKIP2:
   MOV 40H, R3
   ; 右移3次后R2肯定为0
   ```

   这样是带四舍五入的结果。

   第二种方法，8个8位数相加求平均值，要求四舍五入的话，只需要在这8个数求和后再加4（`0100B`），之后右移3次。

   ``` asm
   ADD A, #04H
   MOV R3, A
   JNC SKIP2
   INC R2

   SKIP2:
   MOV R4, #03H
   LOOP2:
   RRC R2
   RRC R3
   DJNZ R4, LOOP2
   ```

   结果保存在R3中。

-----

## 中断系统

1. 8051的外部中断有低电平触发和下降沿触发两种触发方式。外部中断1的中断向量地址是`0013H`。

   在响应中断时, 单片机自动生成一条长调用指令`LCALL addr16`, 其地址为中断入口地址。

   |中断源|入口地址|
   |:---:|:-----:|
   |INT0|0003H|
   |T0|000BH|
   |INT1|0013H|
   |T1|001BH|
   |串行口|0023H|

   通常在中断入口地址处放一条**无条件转移指令**`*JMP`。

   内部查询顺序同入口地址的顺序，由高到低。

2. 执行指令`MOV IP, #0BH`( `#00001011B`)后, 中断优先级最高者为`PX0`, 最低为`PS`。

   IP: 中断优先级寄存器, 其前3为无意义, 后5位( IP.4至IP.0)为：`PS`, `PT1`, `PX1`, `PT0`, `PX0`, 分别对应串行口、定时器T1、外部中断1、定时器0、外部中断0。

   | |D7|D6|D5|D4|D3|D2|D1|D0|
   |:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
   |IP| | | |PS|PT1|PX1|PT0|PX0|

   单片机复位以后, IP的内容为0, 各个中断源均为低优先级中断。

   在同时收到几个同一优先级的中断请求时, 中断响应取决于内部查询顺序, 其顺序由高到低为：`INT0`、`T0`、`INT1`、`T1`、`串行口`。

   当中断源均为同一优先级时, 当它们同时申请中断时CPU首先响应外部中断0

3. 8051的晶振频率为12MHz, 则最短的外部中断响应时间为3{{< mathjax/inline >}}\(\mu\){{< /mathjax/inline >}}s, 最长的外部中断响应时间为12{{< mathjax/inline >}}\(\mu\){{< /mathjax/inline >}}。

4. 中断标记位于单片机寄存器的`TCON`和`SCON`中。

   | |D7|D6|D5|D4|D3|D2|D1|D0|
   |:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
   |TCON|TF1|TR1|TF0|TR0|IE1|IT1|IE0|IT0|
   |SCON|SM0|SM1|SM2|REN|TB8|RB8|TI|RI|

   `TCON`中`TF1`和`TF0`为定时器/计数器中断标志位, `TR1`和`TR0`为定时/计数启动位, `IE1`和`IE0`为外部中断标志位, `IT1`和`IT0`为选择外部中断为边沿触发(1)还是电平触发(0)方式。

   `SCON`中前几位与串行口有关，第1位和第2位的`TI`和`RI`(是大写字母I不是数字1)分别为串行口中断发送中断请求标志位(发送成功后置1)和接受中断请求标志位( 接受成功后置1)。串口中断无法硬件清零, 只能软件清零。

   当IE中EA为1、ES为1时，TI或RI为1时，CPU执行无条件转移指令`LJMP 0023H`, 执行串行口中断服务程序。

5. 要使8051能够响应定时器T1的中断和串行口中断, 不响应其他中断, 则中断允许寄存器`IE`的内容为`98H`(`10011000B`)。

   中断允许寄存器IE：
   | |D7|D6|D5|D4|D3|D2|D1|D0|
   |:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
   |IE|EA| | |ES|ET1|EX1|ET0|EX0|

   `EA`为总控制位, 当`EA`为1时, CPU才可以响应中断请求。

   `ES`为串行口中断允许位, `ET1`和`ET0`为定时器中断允许位, `EX1`和`EX0`为外部中断允许位。

-----

## 定时器和计数器

1. 使T0工作方式1的溢出周期最长的初值是`0000H`。

   定时器/计数器工作在方式0为13位计数器, 由`TLX`的低5位和`THX`的高8位组成13位计数器, 最大值为{{< mathjax/inline >}}\(2^{13}-1 = 8191\){{< /mathjax/inline >}}, 晶振频率12MHz下计时周期最长为8.192ms。工作在方式1时由均为8位的`TLX`和`THX`组成16位计数器, 最大值为65535, 晶振频率为12M下最长为65.536ms。

   当定时器/计数器工作在方式2时, 可以循环定时/计数。当计数溢出后, 自动将8位的`THX`装入8位的`TLX`中, 可省去重装初值的时间, 最大值为`255`, 晶振频率12M下计时周期最长为0.256ms。

2. `T1`配置为方式3时, 停止计数, 方式3只适用于定时器0。

   定时器`T0`的方式3将其分为两个8位定时器, 其中`TH0`只能做定时器使用。

3. 设8051单片机的晶振频率为12MHz, 定时器作计数器使用时, 其计数输入信号的最高频率为500KHz。

   当定时器用作计数器时, 当检测到引脚上的负跳变时计数器的值增一。检测下降沿需要2个机器周期, 即24个震荡周期, 所以输入信号最高频率为 {{< mathjax/inline >}}\(12M \div 24 = 500KHz\){{< /mathjax/inline >}}。

4. 用定时器方式2扩展一个下降沿触发的外部中断, 计数初值应为`FFH`。

   此处定时器2以计数器方式运行, 当检测到一个下降沿后, 计数器加一后溢出, 因此会执行定时器中断的中断子程序。

-----

> 2020年12月3日：
> 前两天感冒, 休息了几天(~~打了两天的游戏~~)后继续。

## 串行口

1. 串行口TXD为高电平, 表示这是数据位或停止位或空闲状态。

   串行口工作在方式1时, `TXD`用来发送数据、`RXD`用来接受数据。方式1的一帧数据为10位, 起始为为0, 停止位为1, 数据位和空闲状态均可能为0或1。

2. 串行口工作在方式3时, 发送的第9位数据要事先写入寄存器`SCON`的`TB8`, 接收的第9位数据被写入同一寄存器的`RB8`。

   串行口控制寄存器SCON：
   | |D7|D6|D5|D4|D3|D2|D1|D0|
   |:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
   |SCON|SM0|SM1|SM2|REN|TB8|RB8|TI|RI|

   其中`SM0`、`SM1`为串口的工作方式选择位, 方式0为同步移位寄存器方式, 方式1为8位异步收发, 方式2和方式3为9位异步收发。

   波特率：串行口每秒钟传送的比特位数，单位bits/s。

   方式0的波特率**固定**为 {{< mathjax/inline >}}\(f_{osc}/12\){{< /mathjax/inline >}}, 方式2的波特率为 {{< mathjax/inline >}}\(f_{osc}/64\){{< /mathjax/inline >}} 或 {{< mathjax/inline >}}\(f_{osc}/32\){{< /mathjax/inline >}} (由SMOD控制)。

   方式1的波特率和方式3的波特率可变, 公式为 {{< mathjax/inline >}}\((2^{SMOD} / 32) \times 定时器T1的溢出率\){{< /mathjax/inline >}}。

   T1的溢出率为定时器T1的周期的倒数，定时器的周期为

   {{< mathjax/block >}}
   $$T = \frac{12\times (2^n - X )}{f\_{osc}}$$
   {{< /mathjax/block >}}

   当T1工作在方式2时，n为8，波特率为：

   {{< mathjax/block >}}
   $$波特率=\frac{(2^{SMOD} \div 32) \times f_{osc}}{12 \times (256 - X)}$$
   {{< /mathjax/block >}}

   {{< mathjax/inline >}}\(X\){{< /mathjax/inline >}}为定时器T1的初值。

   串口工作在方式1，波特率为2400，则每秒钟最大能发送/接收 {{< mathjax/inline >}}\(2400 \div 10 = 240Byte\){{< /mathjax/inline >}} 的数据。

   > 单片机工作在方式1时, 1帧数据为1个起始位、8个数据位、1个停止位共10位。

   8051的UART工作在方式3，要求每秒钟能传送不少于900个字节的数据，则波特率应当大于 {{< mathjax/inline >}}\(900 \times 8 = 7200bits/s\){{< /mathjax/inline >}}。

3. 比特率2400Kbits/s，时钟频率12M，PC机发送8个字节的数据存到单片机的`30H-37H`中，随后单片机发送2个确认字节`55H`和`AAH`给PC机，使用查询方式。

   ``` asm
   ORG 0000H
   MAIN:
   MOV SCON, #50H
   ; 串口使用方式1，且允许接收
   MOV PCON, #00H
   ; 波特率不加倍
   MOV TMOD, #20H
   ; 定时器1使用方式2

   MOV TL1, #0F3H
   MOV TH1, #0F3H
   SETB TR1

   LOOP:
   MOV R0, #30H
   MOV R1, #08H

   REC:
   JNB RI, $
   MOV @R0, SBUF
   CLR RI ; 软件清零RI
   INC R0
   DJNZ R1, REC

   MOV SBUF, #55H
   JNB TI, $
   CLR TI

   MOV SBUF, #0AAH
   JNB TI, $
   CLR TI
   AJMP LOOP

   END
   ```

   单片机接收到数据后，RI被置1，代表SBUF中的数据有效，取走SBUF中的数据后需要软件清零RI（串口中断不会自动清零RI）。

   当单片机执行写SBUF操作时，串口发送开始，TI被自动置1，在发送完成后TI被自动清0。

-----

> 2020年12月7日：

## I/O口 & 外部存储器拓展

1. 8051使用指令`MOVX A, @R0`读外部数据存储器时，不起作用的信号是`WR`。

   8051在使用`MOVX @DPTR`类指令读外部数据存储器时，P0和P2先输出外部数据的地址，单片机发出的`ALE`信号的负跳沿将P0口输出的地址锁存在地址锁存器(74HC573)里，之后单片机发出`RD`信号，读取外部数据存储器（RAM）的数据到总线再传送到P0口上。最后单片机从P0口读取数据保存到A中。

   如果是写外部数据存储器时，单片机将不发出`RD`信号而是`WR`信号，将A中的数据写入外部数据存储器中。

2. 存储器芯片6264需要13根地址线。

   62256的容量为 {{< mathjax/inline >}}\(256Kbit \div 8 = 32KB = 2^{15}\){{< /mathjax/inline >}}, 需要15根地址线。

   6264的容量为 {{< mathjax/inline >}}\(64Kbit \div 8 = 8KB = 2^{13}\){{< /mathjax/inline >}}，所以需要13根地址线。

   6116容量为 {{< mathjax/inline >}}\(16Kbit \div 8 = 2KB = 2^{11}\){{< /mathjax/inline >}}, 需要11根地址线。

   计算方法是62 {{< mathjax/inline >}}\(X\){{< /mathjax/inline >}} 的 {{< mathjax/inline >}}\(容量=X \div 8(K)\){{< /mathjax/inline >}}。

3. 使用16位地址模式时，8051的外部数据存储器寻址空间为64KB。

4. 基于8051的单片机系统能拓展的外部数据存储器容量无限制。

   有的书上说最大只能拓展64KB，实际是最大寻址空间为64KB，拓展的外部数据存储器容量无限制。

5. 8051的程序存储器可用来存放用户程序和数据。 例如使用`DW`或`DB`指令用来定义数据。

   所以应用程序也可以使用`MOVC A, @A+DPTR`访问程序存储器中的数据。

> 除此之外LED数码管和外部存储器拓展、外部I/O设备拓展部分有很多需要根据线路图计算地址和DA转换的题，因为线路图源自老师提供的PDF，而老师为PDF加了密码，意味着不允许外传，所以我就不放到博客上面了，~~除非我自己用Porteus画一个类似的~~

6. LED段码入口地址8004H，位选入口地址8002H，将30H-32H保存的6个压缩BCD码发送到6位共阴极数码管上显示， 要求编写延时1ms的子程序。

   ``` asm
   MAIN:
   MOV R0, #30H
   ; R2用来计数
   MOV R2, #03H
   ; R3用来位选
   MOV R3, #01H

   LOOP:
   MOV A, @R0
   SWAP A
   ANL A, #0FH
   MOV DPTR, #TAB
   MOVC A, @A+DPTR
   ; 取高4位BCD码对应的段码

   MOV DPTR, #8004H
   MOVX A, @A+DPTR
   ; 先送段码

   MOV A, R3
   MOV DPTR, #8002H
   MOVX @DPTR, A
   RL A
   MOV R3, A
   ; 再送位选

   LCALL DELAY

   MOV A, @R0
   ANL A, #0FH
   MOV DPTR, #TAB
   MOVC A, @A+DPTR
   ; 取低4位BCD码对应的段码

   MOV DPTR, #8004H
   MOVX A, @A+DPTR
   ; 送段码

   MOV A, R3
   MOV DPTR, #8002H
   MOVX @DPTR, A
   RL A
   MOV R3, A
   ; 送位选

   LCALL DELAY
   INC R0

   DJNZ R2, LOOP

   DELAY:
   MOV R7, #250
   DL:
   NOP
   NOP
   DJNZ R7, DL
   RET

   TAB:
   DB 3FH, 06H, 5BH, 4FH, 66H, 6DH, 7DH, 07H, 7FH, 6FH

   END
   ```

7. 打印机数据输入接口和P1直接相连，STB接口和P3.4相连，BUSY接口和P3.3相连，不使用ACK应答信号，编写将外部存储器`1000H-100FH`的数据发送到打印机打印的子程序。

   ![](images/1.jpg#center)

   ``` asm
   PRINT:
   MOV DPTR, #1000H
   MOV R2, #10H

   LOOP:
   JB P3.3, $
   ; 确保打印机处于空闲状态
   MOVX A, @DPTR
   MOV P1, A
   CLR P3.4
   SETB P3.4
   INC DPTR
   DJNZ R2, LOOP
   RET
   ```

   如果打印机没有和P1直接相连，而是连接到数据锁存器上（74HC374），锁存器的时钟信号的入口地址为`A000H`。

   使用堆栈保护间接寻址寄存器的值。

   ``` asm
   PRINT:
   MOV R2, #10H
   MOV DPTR, #1000H
   LOOP:
   JB P3.3, $
   ; 确保打印机处于空闲状态

   MOVX A, @DPTR
   PUSH DPL
   PUSH DPH
   MOV DPTR, #0A000H
   MOVX @DPTR, A
   POP DPH
   POP DPL

   CLR P3.4
   SETB P3.4
   INC DPTR
   DJNZ R2, LOOP
   RET
   ```

-----

## SFR列表

|87H|D7|D6|D5|D4|D3|D2|D1|D0|
|:----:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|PCON|SMOD|-|-|-|-|-|PD|IDL|

|88H|D7|D6|D5|D4|D3|D2|D1|D0|
|:----:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|TCON|TF1|TR1|TF0|TR0|IE1|IT1|IE0|IT0|

|89H|D7|D6|D5|D4|D3|D2|D1|D0|
|:----:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|TMOD|GATE|C/T|M1|M0|GATE|C/T|M1|M0|

|98H|D7|D6|D5|D4|D3|D2|D1|D0|
|:----:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|SCON|SM0|SM1|SM2|REN|TB8|RB8|TI|RI|

|A8H|D7|D6|D5|D4|D3|D2|D1|D0|
|:----:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|IE|EA|-|-|ES|ET1|EX1|ET0|EX0|

|B8H|D7|D6|D5|D4|D3|D2|D1|D0|
|:----:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|IP|-|-|-|PS|PT1|PX1|PT0|PX0|

|D0H|D7|D6|D5|D4|D3|D2|D1|D0|
|:----:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|PSW|Cy|Ac|F0|RS1|RS0|OV|-|P|

-----
