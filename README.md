# Multi Database Script Tool #

A tool to run SQL scripts against multiple MSSQL databases.

## Summary ##

When you're working on a multi-tenant application, chances are you have multiple databases (one for each client).
And there will come times (hopefully not often) when you may need to run a query or a patch across multiple (or all)
clients. In SQLServer, the quick and dirty way to accomplish this was to dynamically generate your query and joined it
with `USE` statements. It was simple enough to do and it got the job done.

However in Azure SQL that is not possible because the [`USE` statement is not allowed.](https://docs.microsoft.com/en-us/sql/t-sql/language-elements/use-transact-sql?view=sql-server-2017#arguments)
You can purchase a tool like Red Gate's [SQL Multi Script](https://www.red-gate.com/products/dba/sql-multi-script/), which
is a pretty good tool,
**OR** as the saying goes "*why pay for something when you can do it yourself?*"


## Running Solution ##

On a fresh clone of the repository, Nuget only downloads the dependencies to the packages directory.
To get the client files to "unpack" to the project directory you will need to open Nuget console and run `Update-Package -reinstall`.
The install script of the package is what actually places the files into the project.
When prompted with "**Do you want to overwrite it?**", enter "**A**" for *Yes to All*.