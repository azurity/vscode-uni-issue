# local-review

local-review 适用于无git仓库管理下的本地代码审计

## Features

- 标注代码创建issue
- issue列表和快速跳转
- 可配置的输入项
- 支持导出为json、yaml、excel三种格式

## User Manual

**插件仅工作于某一代码工作区下，不支持单文件**

### 配置导入
> 支持通过配置文件，自定义需要输入的选项，**配置文件需要导入当前工作区的.vscode目录下**

`settings.json`文件推荐配置如下
```jsonc
{
  "uniIssue.formDesc": [
    {
      "name": "漏洞类型",
      "type": "text"
    },
    {
      "name": "漏洞等级",
      "type": "select",
      "options": ["建议", "一般", "严重", "致命"]
    },
    {
      "name": "起始位置",
      "type": "$beginPosition",
      "hidden": true
      
    },
    {
      "name": "结束位置",
      "type": "$endPosition",
      "hidden": true
    },
    {
      "name": "漏洞描述",
      "type": "multiline",
    },
    {
      "name": "提单人",
      "type": "text",
      "default": "LordCasser"
    },
    {
      "name": "日期",
      "type": "$now_date"
    },
    {
      "name": "状态",
      "type": "$status",
      "hidden": true
    }
  ],
  "uniIssue.statusText": {
    "unfinished": "OPEN",
    "finished": "CLOSE"
  }
}
```

### 新增issue

右键菜单 -> create issue

![image-20220620094800269](https://s2.loli.net/2022/06/20/ZY56vNxj7EHJwto.png)

出现依据配置文件生成的页面

![image-20220620094928445](https://s2.loli.net/2022/06/20/uo3TQFeXlM8bWjE.png)

创建成功后会显示的标识出issue

![image-20220620095113495](https://s2.loli.net/2022/06/20/7DgSntROmH92GUk.png)

### 查看issue

创建issue后，在扩展栏进入插件页面，可预览所有工作区下创建的issue

![image-20220620095236443](https://s2.loli.net/2022/06/20/kr1gu9UhAizoGHO.png)

### 关闭issue

当一个issue确认修复后，可在issue列表对issue进行关闭

![image-20220620095641425](https://s2.loli.net/2022/06/20/9eAGCFpqJYaO75U.png)

关闭后issue以浅色标识

![image-20220620095724657](https://s2.loli.net/2022/06/20/LeQ8J9VY4EBUNKS.png)

### 删除issue

当issue创建错误后，可对issue进行删除

![image-20220620095859416](https://s2.loli.net/2022/06/20/4EkxwhK2iGPUmyV.png)

### 导出issue

当issue需要导出时，可选择导出为yaml、json、Excel，通过export issues指令进行导出

![image-20220620100150429](https://s2.loli.net/2022/06/20/Dz6kW9eiHZAq1LY.png)

yaml导出

![image-20220620100740010](https://s2.loli.net/2022/06/20/WeU6LrgFkuPEiBD.png)

json导出

![image-20220620100622094](https://s2.loli.net/2022/06/20/7K6V4wHBAG8Eb1v.png)

Excel导出

![image-20220620101049716](https://s2.loli.net/2022/06/20/yxaLmFOYfCeUkZ5.png)

## Extension Settings

```jsonc
{
    // define the form format
    "uniIssue.formDesc": [
        {
            "name": "<name of the prop>",
            "type": "<type of the prop>",
            // text, select, multiline
            // $now_date, $now_datetime, $region, $path, $abs_path, $beginPosition, $endPosition, $status
            
            "detail": false,
            // if true, will not show in hover hint.

            "default": "xxx",
            // [optional] only for text, set default value.

            "options": ["a", "b", "c"],
            // only for select, provide options.
        },
        ...
    ],
    // [optional] custom status text
    "uniIssue.statusText": {
        "unfinished": "OPEN",
        "finished": "CLOSE"
    }
}
```

- `text`: single line text input.
- `select`: select.
- `multiline`: multi line text input.
- `$now_date`: date of now.
- `$now_datetime`: date and time of now.
- `$region`: the select region of your code.
- `$path`: path of the file you selected, relative to workspace-folder.
- `$abs_path`: similar to `$path`, but format as absolute path.
- `$beginPosition`: a path with row and col info, can link to the begin position of the select range.
- `$endPosition`: a path with row and col info, can link to the end position of the select range.
- `$status`: status of the issue, unfinished or finished (or show in your custom text, if you set yourself `statusText`).

**Enjoy!**
