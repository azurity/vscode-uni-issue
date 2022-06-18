const vscode = acquireVsCodeApi();

const generator = new Map([
    ["$now_date", () => ""],
    ["$now_datetime", () => ""],
    ["$region", () => ""],
    ["$path", () => ""],
    ["$abs_path", () => ""],
    ["$beginPosition", () => ""],
    ["$endPosition", () => ""],
    ["$status", () => ""],
    ["text", (desc, index) => {
        return `
<div class="label">${desc.name}</div>
<input id="${index}" value="${desc.default ?? ""}">
        `
    }],
    ["multiline", (desc, index) => {
        return `
<div class="label">${desc.name}</div>
<textarea id="${index}" rows="5"></textarea>
        `
    }],
    ["select", (desc, index) => {
        let options = [""];
        if (desc.options instanceof Array) {
            for (let opt of desc.options) {
                options.push(opt.toString());
            }
        }
        return `
<div class="label">${desc.name}</div>
<select id="${index}">${options.map((opt) => `<option value="${opt}">${opt}</option>`)}</select>
        `
    }],
]);

document.body.innerHTML = `
<div class="container">${formDesc.map((item, index) => {
    if (generator.has(item.type)) {
        return generator.get(item.type)(item, index);
    }
}).join('')
    }
    <button id="submit">submit</button>
</div>
`;

document.getElementById("submit").addEventListener("click", () => {
    let data = Object.fromEntries(new Map(formDesc.map((item, index) => {
        if (item.type[0] == '$') {
            return [item.name, item.type];
        } else {
            return [item.name, document.getElementById(index.toString()).value];
        }
    })));
    vscode.postMessage(data);
});
