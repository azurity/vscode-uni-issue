# uni-issue

uni-issue 适用于无git仓库管理下的本地代码审计

## Features

- 标注代码创建issue
- issue列表和快速跳转
- 可配置的输入项
- 支持导出为json、yaml、excel三种格式

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
            
            "hidden": false,
            // [optional] if true, will not show in hover hint.

            "default": "xxx",
            // [optional] only for text, set default value.

            "options": ["a", "b", "c"],
            // [optional] only for select, provide options.
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
