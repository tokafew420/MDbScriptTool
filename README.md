# Multi Database Script Tool #

A tool to run SQL scripts against multiple MSSQL databases.


[![GitHub (pre-)release](https://img.shields.io/github/release/tokafew420/MDbScriptTool/all.svg)](https://github.com/tokafew420/MDbScriptTool/releases) [![Github All Releases](https://img.shields.io/github/downloads/tokafew420/MDbScriptTool/total.svg)](https://github.com/tokafew420/MDbScriptTool/releases)


## Summary ##

When you're working on a multi-tenant application, chances are you have multiple databases (one for each client).
And there will come times (hopefully not often) when you may need to run a query or a patch across multiple (or all)
clients. In SQLServer, the quick and dirty way to accomplish this was to dynamically generate your query and joined it
with `USE` statements. It was simple enough to do and it got the job done.

However in Azure SQL that is not possible because the [`USE` statement is not allowed.](https://docs.microsoft.com/en-us/sql/t-sql/language-elements/use-transact-sql?view=sql-server-2017#arguments)
You can purchase a tool like Red Gate's [SQL Multi Script](https://www.red-gate.com/products/dba/sql-multi-script/), which
is a pretty good tool,
**OR** as the saying goes "*why pay for something when you can do it yourself?*"


## Releases ##

Download the latest release from [here](https://github.com/tokafew420/MDbScriptTool/releases). Then just unzip and run the `MDbScriptTool.exe`.

## Running Solution ##

The [Web Essentials 2017](https://marketplace.visualstudio.com/items?itemName=MadsKristensen.WebExtensionPack2017) extension is used to compile `css` and `js` files for releases. Install the extension from the VS market place.

## Alternatives ##

Here are some other alternatives.

- Red Gate's [SQL Multi Script](https://www.red-gate.com/products/dba/sql-multi-script/) - Commerical tool
- [ApexSQL Propagate 2018](https://www.apexsql.com/sql_tools_propagate.aspx) - Free Commercial tool
- [xSQL Script Executor](https://www.xsql.com/products/script_executor/) - Free for Personal Use
- [TakoDeploy](https://github.com/andreujuanc/TakoDeploy) - Open Source
- [Sp_MSforeachDB](https://dba.stackexchange.com/a/908) - Undocumented procedure (Doesn't work on Azure)
