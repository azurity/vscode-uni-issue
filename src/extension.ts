// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as YAML from "yaml";
import * as path from "path";
import * as XLSX from "xlsx";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("uni-issue.create", () => {
    if (!!vscode.window.activeTextEditor) {
      let docPath = vscode.window.activeTextEditor.document.uri.toString();
      for (let k of issueSet.keys()) {
        let base = issueSet.get(k)!.base.toString();
        if (base == docPath.slice(0, base.length)) {
          let selection = vscode.window.activeTextEditor.selection;
          createIssueDialog(
            issueSet.get(k)!.base,
            k,
            docPath.slice(base.length + 1),
            [
              selection.start.line,
              selection.start.character,
              selection.end.line,
              selection.end.character,
            ]
          );
          break;
        }
      }
    }
  });

  let exportDisposable = vscode.commands.registerCommand(
    "uni-issue.export",
    async () => {
      let file = await vscode.window.showSaveDialog({
        filters: {
          json: ["json"],
          yaml: ["yaml"],
          excel: ["xlsx"],
        },
      });
      if (file === undefined) {
        return;
      }
      let ext = path.extname(file.path).toLowerCase().slice(1);
      let exportData = generateExport();
      if (exporters[ext]) {
        let data = exporters[ext](exportData);
        vscode.workspace.fs.writeFile(file, data);
      } else {
        vscode.window.showInformationMessage(`unknown ext '${ext}'`);
      }
    }
  );

  let removeDisposable = vscode.commands.registerCommand(
    "uni-issue.remove",
    async (item: Issue) => {
      let key = item.$meta.base + "/.vscode/.uni_issue.yaml";
      if (issueSet.get(key)) {
        let index = issueSet.get(key)!.issues.findIndex((v) => v == item);
        if (index >= 0) {
          issueSet.get(key)!.issues.splice(index, 1);
          await storeYaml(vscode.Uri.parse(key), issueSet.get(key)!.issues);
        }
      }
    }
  );

  let finishDisposable = vscode.commands.registerCommand(
    "uni-issue.finish",
    async (item: Issue) => {
      let key = item.$meta.base + "/.vscode/.uni_issue.yaml";
      if (issueSet.get(key)) {
        let index = issueSet.get(key)!.issues.findIndex((v) => v == item);
        if (index >= 0) {
          issueSet.get(key)!.issues[index].$meta.status = true;
          await storeYaml(vscode.Uri.parse(key), issueSet.get(key)!.issues);
        }
      }
    }
  );

  let unfinishDisposable = vscode.commands.registerCommand(
    "uni-issue.unfinish",
    async (item: Issue) => {
      let key = item.$meta.base + "/.vscode/.uni_issue.yaml";
      if (issueSet.get(key)) {
        let index = issueSet.get(key)!.issues.findIndex((v) => v == item);
        if (index >= 0) {
          issueSet.get(key)!.issues[index].$meta.status = false;
          await storeYaml(vscode.Uri.parse(key), issueSet.get(key)!.issues);
        }
      }
    }
  );

  uniDeco = vscode.window.createTextEditorDecorationType({
    textDecoration: "underline wavy red",
  });
  uniDecoFin = vscode.window.createTextEditorDecorationType({
    textDecoration: "underline wavy rgb(127 127 127 / 0.7)",
  });

  issueTree = new IssueTreeProvider();
  vscode.window.createTreeView("issues", {
    treeDataProvider: issueTree,
  });

  issueSet = new Map();

  vscode.workspace.onDidChangeWorkspaceFolders(reloadWorkspaceInfo);
  reloadWorkspaceInfo();

  vscode.window.onDidChangeActiveTextEditor(refreshHighlight);
  vscode.languages.registerHoverProvider(
    { scheme: "file" },
    new HoverProvider()
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(exportDisposable);
  context.subscriptions.push(removeDisposable);
  context.subscriptions.push(finishDisposable);
  context.subscriptions.push(unfinishDisposable);
}

export function deactivate() {}

let uniDeco: vscode.TextEditorDecorationType;
let uniDecoFin: vscode.TextEditorDecorationType;

interface Issue {
  $meta: {
    base: string;
    file: string;
    region: number[];
    status: boolean;
  };
  [x: string]: any;
}

type SpaceSet = {
  base: vscode.Uri;
  watcher: vscode.FileSystemWatcher;
  issues: Issue[];
};

let issueSet: Map<string, SpaceSet>;

let issueTree: IssueTreeProvider;

async function reloadWorkspaceInfo() {
  let keys = new Set([...issueSet.keys()]);
  if (vscode.workspace.workspaceFolders !== undefined) {
    for (let ws of vscode.workspace.workspaceFolders) {
      let uri = vscode.Uri.joinPath(ws.uri, ".vscode");
      let key = uri.toString() + "/.uni_issue.yaml";
      let watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(uri, ".uni_issue.yaml")
      );
      issueSet.set(key, { base: ws.uri, watcher: watcher, issues: [] });
      if (keys.has(key)) {
        keys.delete(key);
      }
      registerWatcher(watcher);
      try {
        issueSet.get(key)!.issues = await loadYaml(
          vscode.Uri.joinPath(uri, ".uni_issue.yaml")
        );
      } catch (e) {}
      refreshHighlight();
    }
  }
  for (let k of keys) {
    issueSet.get(k)!.watcher.dispose();
    issueSet.delete(k);
  }
  issueTree.referesh();
}

function registerWatcher(watcher: vscode.FileSystemWatcher) {
  watcher.onDidCreate(async (uri) => {
    issueSet.get(uri.toString())!.issues = await loadYaml(uri);
    refreshHighlight();
    issueTree.referesh();
  });
  watcher.onDidChange(async (uri) => {
    issueSet.get(uri.toString())!.issues = await loadYaml(uri);
    refreshHighlight();
    issueTree.referesh();
  });
  watcher.onDidDelete((uri) => {
    issueSet.get(uri.toString())!.issues = [];
    refreshHighlight();
    issueTree.referesh();
  });
}

async function loadYaml(uri: vscode.Uri) {
  let data = await vscode.workspace.fs.readFile(uri);
  let parsed = YAML.parse(Buffer.from(data).toString("utf-8"));
  if (!(parsed instanceof Array)) {
    return [];
  } else {
    return parsed as Issue[];
  }
}

async function storeYaml(uri: vscode.Uri, data: any[]) {
  await vscode.workspace.fs.writeFile(
    uri,
    Buffer.from(YAML.stringify(data), "utf-8")
  );
}

const specialValueExplain: any = {
  $now_date: () => {
    return new Date().toLocaleDateString();
  },
  $now_datetime: () => {
    return new Date().toLocaleString();
  },
  $region: (desc: any) => {
    return desc.region;
  },
  $path: (desc: any) => {
    return desc.file;
  },
  $abs_path: (desc: any) => {
    return desc.base + "/" + desc.file;
  },
  $beginPosition: (desc: any) => {
    return `${desc.file}:${desc.region[0] + 1}:${desc.region[1] + 1}`;
  },
  $endPosition: (desc: any) => {
    return `${desc.file}:${desc.region[2] + 1}:${desc.region[3] + 1}`;
  },
  $status: (desc: any) => {
    const text: any = vscode.workspace
      .getConfiguration("uniIssue")
      .get("statusText");
    if (desc.status) {
      return text.finished;
    } else {
      return text.unfinished;
    }
  },
};

function createIssueDialog(
  base: vscode.Uri,
  key: string,
  file: string,
  region: number[]
) {
  let panel = vscode.window.createWebviewPanel(
    "markdown.preview",
    "create issue",
    { preserveFocus: false, viewColumn: -2 },
    { enableCommandUris: true, enableScripts: true, enableFindWidget: true }
  );
  const desc = vscode.workspace.getConfiguration("uniIssue").get("formDesc");
  panel.webview.html = `
<html>
<head>
<link href="${panel.webview.asWebviewUri(
    vscode.Uri.file(path.resolve(__dirname, "../static/webview.css"))
  )}" rel="stylesheet">
</head>
<body>
<script>const formDesc = ${JSON.stringify(desc)};</script>
<script src=${panel.webview.asWebviewUri(
    vscode.Uri.file(path.resolve(__dirname, "../static/webview.js"))
  )}></script>
</body>
</html>
	`;
  panel.webview.onDidReceiveMessage(async (data) => {
    panel.dispose();
    const desc = {
      base: base.toString(),
      file: file,
      region: region,
      status: false,
    };
    let now = new Date().toLocaleDateString();
    data["$meta"] = desc;
    for (var title in data) {
      if (data[title] == "$now_date" || data[title] == "$now_datetime") {
        data[title] = specialValueExplain[data[title]]();
      }
    }
    issueSet.get(key)!.issues.push(data);
    await storeYaml(vscode.Uri.parse(key), issueSet.get(key)!.issues);
  });
  panel.reveal(-2);
}

function refreshHighlight() {
  if (!!vscode.window.activeTextEditor) {
    let docPath = vscode.window.activeTextEditor.document.uri.toString();
    for (let k of issueSet.keys()) {
      let base = issueSet.get(k)!.base.toString();
      if (base == docPath.slice(0, base.length)) {
        let subPath = docPath.slice(base.length + 1);
        let decos = [];
        let decosFin = [];
        for (let item of issueSet.get(k)!.issues) {
          let meta = item["$meta"];
          if (meta.file == subPath) {
            if (!meta.status) {
              decos.push(
                new vscode.Range(
                  meta.region[0],
                  meta.region[1],
                  meta.region[2],
                  meta.region[3]
                )
              );
            } else {
              decosFin.push(
                new vscode.Range(
                  meta.region[0],
                  meta.region[1],
                  meta.region[2],
                  meta.region[3]
                )
              );
            }
          }
        }
        vscode.window.activeTextEditor.setDecorations(uniDeco, decos);
        vscode.window.activeTextEditor.setDecorations(uniDecoFin, decosFin);
        break;
      }
    }
  }
}

function generateExport() {
  const desc: any = vscode.workspace
    .getConfiguration("uniIssue")
    .get("formDesc");
  let head = desc.map((item: any) => item.name);
  let data = [];
  for (let k of issueSet.keys()) {
    for (let item of issueSet.get(k)!.issues) {
      let result: any = {};
      for (let key of head) {
        if (item[key] === undefined) {
          result[key] = "";
        } else {
          result[key] = item[key];
          if (result[key][0] == "$") {
            if (
              specialValueExplain[result[key]] &&
              item["$meta"] !== undefined
            ) {
              result[key] = specialValueExplain[result[key]](item["$meta"]);
            } else {
              result[key] = "";
            }
          }
        }
      }
      data.push(result);
    }
  }
  return { head, data };
}

const exporters: any = {
  json: (arg: any) => {
    return Buffer.from(JSON.stringify(arg.data), "utf-8");
  },
  yaml: (arg: any) => {
    return Buffer.from(YAML.stringify(arg.data), "utf-8");
  },
  xlsx: (arg: any) => {
    let workbook = XLSX.utils.book_new();
    let worksheet = XLSX.utils.json_to_sheet(arg.data, { header: arg.head });
    XLSX.utils.book_append_sheet(workbook, worksheet, "issues");
    return XLSX.write(workbook, { type: "buffer" });
  },
};

class IssueTreeProvider implements vscode.TreeDataProvider<SpaceSet | Issue> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    void | SpaceSet | Issue | (SpaceSet | Issue)[] | null | undefined
  >();
  onDidChangeTreeData: vscode.Event<
    void | SpaceSet | Issue | (SpaceSet | Issue)[] | null | undefined
  > = this._onDidChangeTreeData.event;

  referesh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(
    element: SpaceSet | Issue
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if ((element as Issue)["$meta"] !== undefined) {
      let meta = (element as Issue)["$meta"];
      return {
        label: `${meta.file}:${meta.region[0] + 1}:${meta.region[1] + 1}`,
        id: `${meta.file}:${JSON.stringify(meta.region)}`,
        contextValue: `uni-issue-item-${meta.status ? "finish" : "unfinish"}`,
        command: {
          title: "goto issue",
          command: "vscode.open",
          arguments: [
            vscode.Uri.parse(`${meta.base}/${meta.file}`),
            {
              selection: new vscode.Range(
                meta.region[0],
                meta.region[1],
                meta.region[2],
                meta.region[3]
              ),
            } as vscode.TextDocumentShowOptions,
          ],
        },
      };
    } else {
      return {
        label: element.base.toString(),
        id: element.base.toString(),
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      };
    }
  }
  getChildren(
    element?: SpaceSet | Issue
  ): vscode.ProviderResult<(SpaceSet | Issue)[]> {
    if (element == undefined) {
      return [...issueSet.values()];
    }
    if (!!(element as Issue)["$meta"]) {
      return undefined;
    } else {
      return element!.issues;
    }
  }
}

class HoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    let docPath = document.uri.toString();
    for (let k of issueSet.keys()) {
      let base = issueSet.get(k)!.base.toString();
      if (base == docPath.slice(0, base.length)) {
        let subPath = docPath.slice(base.length + 1);
        for (let item of issueSet.get(k)!.issues) {
          let meta = item["$meta"];
          if (meta.file == subPath) {
            let range = new vscode.Range(
              meta.region[0],
              meta.region[1],
              meta.region[2],
              meta.region[3]
            );
            if (range.contains(position)) {
              return new vscode.Hover(this.generateHoverInfo(item), range);
            }
            return;
          }
        }
      }
    }
  }

  private generateHoverInfo(item: Issue) {
    const desc: any = vscode.workspace
      .getConfiguration("uniIssue")
      .get("formDesc");
    return desc
      .map((it: any) => {
        if (it.hidden) {
          return "";
        }
        let value = item[it.name] ?? "";
        if (value[0] == "$") {
          if (specialValueExplain[value] && item.$meta !== undefined) {
            value = specialValueExplain[value](item.$meta);
          } else {
            value = "";
          }
        }
        return `**${it.name}**: ${value}`;
      })
      .filter((it: string) => it != "")
      .join("\n\n");
  }
}
