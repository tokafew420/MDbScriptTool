// Adapted from CodeMirror's sql mode, found in CodeMirror/mode/sql/sql.js

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function (CodeMirror) {
    'use strict';

    CodeMirror.defineMode('tsql', function (config, parserConfig) {
        'use strict';

        var atoms = parserConfig.atoms || {},
            operatorChars = parserConfig.operatorChars || {},
            operatorWords = parserConfig.operatorWords || {},
            types = parserConfig.types || {},
            keywords = parserConfig.keywords || {},
            builtin = parserConfig.builtin || {},
            options = parserConfig.options || {},
            atAtFunctions = parserConfig['@@'] || {},
            sysviews = parserConfig.sysviews || {},
            sysprocs = parserConfig.sysprocs || {},
            support = parserConfig.support || {
                binary: true
            };


        function tokenBase(stream, state) {
            var ch = stream.next();
            //return null;
            if (support.binary &&
                (ch === '0' && stream.match(/^[xX][0-9a-fA-F]+/))) {
                // hex
                // https://docs.microsoft.com/en-us/sql/t-sql/data-types/constants-transact-sql?view=sql-server-2017#binary-constants
                return 'number';
            } else if (ch.charCodeAt(0) > 47 && ch.charCodeAt(0) < 58) {
                // numbers
                // https://docs.microsoft.com/en-us/sql/t-sql/data-types/constants-transact-sql?view=sql-server-2017#integer-constants
                // https://docs.microsoft.com/en-us/sql/t-sql/data-types/constants-transact-sql?view=sql-server-2017#float-and-real-constants
                stream.match(/^[0-9]*(\.[0-9]+)?([eE][-+]?[0-9]+)?/);
                return 'number';
            } else if (ch === '$') {
                if (stream.match(/PARTITION/i)) {
                    // Special case for this odd system function
                    return 'builtin';
                }
                // money
                // https://docs.microsoft.com/en-us/sql/t-sql/data-types/constants-transact-sql?view=sql-server-2017#money-constants
                stream.match(/^[0-9]+/);
                return 'number';
            } else if (ch === "'" ||
                /* eslint-disable no-extra-parens */
                (ch === 'N' && stream.eat("'")) ||
                (!state.options.quoted_identifier && ch === '"') ||
                (!state.options.quoted_identifier && ch === 'N' && stream.eat('"'))) {
                /* eslint-enable no-extra-parens */
                // strings
                // https://docs.microsoft.com/en-us/sql/t-sql/data-types/constants-transact-sql?view=sql-server-2017#character-string-constants
                state.tokenize = tokenLiteral(stream.current().replace('N', ''));

                return state.tokenize(stream, state);
            } else if (ch === '[' ||
                /* eslint-disable no-extra-parens */
                (state.options.quoted_identifier && ch === '"')) {
                /* eslint-enable no-extra-parens */
                // identifiers
                // https://docs.microsoft.com/en-us/sql/relational-databases/databases/database-identifiers?view=sql-server-2017
                state.tokenize = tokenIdentifier(ch === '[' ? ']' : ch);

                return state.tokenize(stream, state);
            } else if (/^[,\;]/.test(ch)) {
                // no highlighting
                return null;
            } else if (ch === '-' && stream.eat('-')) {
                // 1-line comment
                // https://docs.microsoft.com/en-us/sql/t-sql/language-elements/comment-transact-sql?view=sql-server-2017
                stream.skipToEnd();

                return 'comment';
            } else if (ch === '/' && stream.eat('*')) {
                // multi-line comments
                // https://docs.microsoft.com/en-us/sql/t-sql/language-elements/slash-star-comment-transact-sql?view=sql-server-2017
                state.tokenize = tokenComment(1);

                return state.tokenize(stream, state);
            } else if (ch === '.') {
                // .1 for 0.1
                if (support.zerolessFloat && stream.match(/^(?:\d+(?:e[+-]?\d+)?)/i))
                    return 'number';
                if (stream.match(/^\.+/))
                    return null;
            } else if (ch === '@') {
                if (stream.eat('@')) {
                    stream.eatWhile(/^[_\w\d]/);
                    var fnName = stream.current().toLowerCase().replace('@@', '');

                    if (atAtFunctions.hasOwnProperty(fnName)) return "builtin";
                } else {
                    // variables
                    // https://docs.microsoft.com/en-us/sql/t-sql/language-elements/variables-transact-sql?view=sql-server-2017
                    stream.eatWhile(/^[_\w\d]/);
                    return 'variable';
                }
                return null;
            } else if (operatorChars.test(ch)) {
                // operators
                stream.eatWhile(operatorChars);
                return 'operator';
            } else {
                stream.eatWhile(/^[_\w\d]/);
                var word = stream.current().toLowerCase();

                // Update options
                if (word === 'set') {
                    state.options._set = true;
                    state.options._option = null;
                } else if (state.options._set && options.hasOwnProperty(word)) {
                    state.options._option = word;
                } else if (word === 'on' || word === 'off') {
                    state.options[state.options._option] = word === 'on';
                    state.options._set = false;
                    state.options._option = null;
                } else {
                    state.options._set = false;
                    state.options._option = null;
                }

                if (atoms.hasOwnProperty(word)) return 'atom';
                if (operatorWords.hasOwnProperty(word)) return 'operator';
                if (types.hasOwnProperty(word)) return 'type';
                if (keywords.hasOwnProperty(word)) return 'keyword';
                if (options.hasOwnProperty(word)) return 'option';
                if (builtin.hasOwnProperty(word)) return 'builtin';
                if (sysviews.hasOwnProperty(word)) return 'sysview';
                if (sysprocs.hasOwnProperty(word)) return 'sysproc';
                return null;
            }
        }

        function tokenLiteral(quote) {
            return function (stream, state) {
                var ch;
                /* eslint-disable eqeqeq */
                // next() documented as returns null but returns undefined
                while ((ch = stream.next()) != null) {
                    /* eslint-enable eqeqeq */
                    if (ch === quote && stream.eat(quote)) continue;

                    if (ch === quote) {
                        state.tokenize = tokenBase;
                        break;
                    }
                }

                return 'string';
            };
        }

        function tokenIdentifier(identifier) {
            return function (stream, state) {
                var ch;
                /* eslint-disable eqeqeq */
                // next() documented as returns null but returns undefined
                while ((ch = stream.next()) != null) {
                    /* eslint-enable eqeqeq */
                    if (ch === identifier && stream.eat(identifier)) continue;

                    if (ch === identifier) {
                        state.tokenize = tokenBase;
                        break;
                    }
                }

                return 'identifier';
            };
        }

        function tokenComment(depth) {
            return function (stream, state) {
                var m = stream.match(/^.*?(\/\*|\*\/)/); // Find '/*' or '*/'
                if (!m) {
                    // Nothing found, skip to end
                    stream.skipToEnd();
                } else if (m[1] === '/*') {
                    // Opening block found, start nested block
                    state.tokenize = tokenComment(depth + 1);
                } else if (depth > 1) {
                    // Closing found, pop out of nested block
                    state.tokenize = tokenComment(depth - 1);
                }
                else {
                    // Closing found and not nested. Go back to basic parsing.
                    state.tokenize = tokenBase;
                }
                return 'comment';
            };
        }

        function pushContext(stream, state, type) {
            state.context = {
                prev: state.context,
                indent: stream.indentation(),
                col: stream.column(),
                type: type,
                align: type === 'end'
            };
        }

        function popContext(state) {
            state.indent = state.context.indent;
            state.context = state.context.prev;
        }

        return {
            startState: function () {
                return {
                    tokenize: tokenBase, context: null, options: {
                        _set: false,
                        _option: null,
                        quoted_identifier: true
                    }
                };
            },

            token: function (stream, state) {
                if (stream.sol()) {
                    if (state.context && state.context.align === null)
                        state.context.align = false;
                }
                if (state.tokenize === tokenBase && stream.eatSpace()) return null;

                var style = state.tokenize(stream, state);
                if (style === 'comment') return style;

                if (state.context && state.context.align === null)
                    state.context.align = true;

                // Handle indent
                var tok = stream.current().toLowerCase();
                if (tok === '(')
                    pushContext(stream, state, ')');
                else if (tok === 'begin')
                    pushContext(stream, state, 'end');
                else if (state.context && state.context.type === tok)
                    popContext(state);

                return style;
            },
            indent: function (state, textAfter) {
                var cx = state.context;
                if (!cx) return CodeMirror.Pass;

                var closing = textAfter === cx.type;
                if (closing && cx.align) {
                    return cx.col;
                } else {
                    return cx.indent + (closing ? 0 : config.indentUnit);
                }
            },
            electricInput: /(\)|end)$/i,
            blockCommentStart: "/*",
            blockCommentEnd: "*/",
            lineComment: '--'
        };
    });

    (function () {
        'use strict';

        // turn a space-separated list into an array
        function set(str) {
            var obj = {}, words = str.split(' ');
            for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
            return obj;
        }

        CodeMirror.defineMIME('text/x-tsql', {
            name: 'tsql',
            atoms: set('null'),
            operatorChars: /^[*+\-%<>!=\(\)]/,
            operatorWords: set(
                // Logical operators
                // https://docs.microsoft.com/en-us/sql/t-sql/language-elements/logical-operators-transact-sql?view=sql-server-2017
                'all and any between exists in is like not or some ' +
                // Table JOINs
                'cross inner join left outer pivot right source unpivot'),
            types: set(
                // Data types
                // https://docs.microsoft.com/en-us/sql/t-sql/data-types/data-types-transact-sql?view=sql-server-2017
                'date datetime datetime2 datetimeoffset smalldatetime time ' + // Date time
                'bigint bit decimal float int money numeric real smallint smallmoney tinyint ' + // Numerics
                'char nchar ntext nvarchar text varchar ' + // Character Strings
                'binary image varbinary ' + // Binary strings
                'cursor hierarchyid geography geometry rowversion sql_variant table uniqueidentifier xml'), // Others
            keywords: set('add alter as asc authorization availability backup begin break browse bulk by cascade case check checkpoint close clustered ' +
                'column commit compute constraint containstable continue create current current_date cursor database deallocate declare ' +
                'default delete deny desc disk distinct distributed double drop dump else end errlvl escape except exec execute exit external ' +
                'fetch file fillfactor for foreign freetext freetexttable from full function go goto grant group group having holdlock identity ' +
                'identity_insert identitycol if index insert intersect into key kill lineno load merge name national next nocheck nonclustered of off ' +
                'offsets on open opendatasource openquery openrowset openxml option order over percent plan precision primary print proc ' +
                'procedure public raiserror read readtext reconfigure references replication restore restrict return revert revoke rollback ' +
                'rowcount rowguidcol rule save schema securityaudit select semantickeyphrasetable semanticsimilaritydetailstable ' +
                'semanticsimilaritytable set setuser shutdown spatial statistics system table tablesample textsize then to top tran transaction trigger ' +
                'truncate union unique updatetext use user values varying view waitfor when where while with within writetext ' +
                // DBCC
                // https://docs.microsoft.com/en-us/sql/t-sql/database-console-commands/database-console-commands?view=sql-server-2017
                'dbcc checkconstraints show_statistics useroptions'
            ),
            builtin: set(
                // Aggregate
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/aggregate-functions-transact-sql?view=sql-server-2017
                'approx_count_distinct avg checksum_agg count count_big grouping grouping_id max min stdev stdevp sum var varp ' +
                // Analystics
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/analytic-functions-transact-sql?view=sql-server-2017
                'cume_dist first_value lag last_value lead percentile_cont percentile_disc percent_rank ' +
                // Collation
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/collation-functions-collationproperty-transact-sql?view=sql-server-2017
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/collation-functions-tertiary-weights-transact-sql?view=sql-server-2017
                'collationproperty tertiary_weights ' +
                // Conversion
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/conversion-functions-transact-sql?view=sql-server-2017
                'cast convert parse try_cast try_convert try_parse ' +
                // Cryptographic
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/cryptographic-functions-transact-sql?view=sql-server-2017
                'asymkey_id asymkeyproperty certproperty cert_id crypt_gen_random decryptbyasymkey decryptbycert decryptbykey decryptbykeyautoasymkey ' +
                'decryptbykeyautocert decryptbypassphrase encryptbyasymkey encryptbycert encryptbykey encryptbypassphrase hashbytes is_objectsigned key_guid ' +
                'key_id key_name signbyasymkey signbycert symkeyproperty verifysignedbycert verifysignedbyasymkey ' +
                // Cursor
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/cursor-functions-transact-sql?view=sql-server-2017
                'cursor_status ' +
                // Data type
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/data-type-functions-transact-sql?view=sql-server-2017
                'datalength ident_current ident_incr ident_seed identity sql_variant_property ' +
                // Date Time
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/date-and-time-data-types-and-functions-transact-sql?view=sql-server-2017
                'current_timestamp current_timezone dateadd datediff datediff_big datefromparts datename datepart datetime2fromparts datetimefromparts datetimeoffsetfromparts ' +
                'day eomonth getdate getutcdate isdate month smalldatetimefromparts switchoffset sysdatetime sysdatetimeoffset sysutcdatetime timefromparts ' +
                'todatetimeoffset year ' +
                // Json
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/json-functions-transact-sql?view=sql-server-2017
                'isjson json_value json_query json_modify ' +
                // Math
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/mathematical-functions-transact-sql?view=sql-server-2017
                'abs acos asin atan atn2 ceiling cos cot degrees exp floor log log10 pi power radians rand round sign sin sqrt square tan ' +
                // Logical
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/logical-functions-choose-transact-sql?view=sql-server-2017
                'choose iif ' +
                // Metadata
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/metadata-functions-transact-sql?view=sql-server-2017
                'app_name applock_mode applock_test assemblyproperty col_length col_name columnproperty database_principal_id databasepropertyex db_id ' +
                'db_name file_id file_idex file_name filegroup_id filegroup_name filegroupproperty fileproperty fulltextcatalogproperty fulltextserviceproperty index_col ' +
                'indexkey_property indexproperty next value for object_definition object_id object_name object_schema_name objectproperty objectpropertyex original_db_name ' +
                'parsename schema_id schema_name scope_identity serverproperty stats_date type_id type_name typeproperty ' +
                // Rank
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/ranking-functions-transact-sql?view=sql-server-2017
                'dense_rank ntile rank row_number ' +
                // Replicatiion
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/replication-functions-publishingservername?view=sql-server-2017
                'publishingservername ' +
                // Rowset
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/rowset-functions-transact-sql?view=sql-server-2017
                'opendatasource openjson openquery openrowset openxml ' +
                // Security
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/security-functions-transact-sql?view=sql-server-2017
                'certencoded certprivatekey current_user has_dbaccess has_perms_by_name is_member is_rolemember is_srvrolemember loginproperty original_login ' +
                'permissions pwdencrypt pwdcompare session_user sessionproperty suser_id suser_name suser_sid suser_sname system_user user user_id user_name ' +
                // String
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/string-functions-transact-sql?view=sql-server-2017
                'ascii char charindex concat concat_ws difference format left len lower ltrim nchar patindex quotename replace replicate reverse right rtrim ' +
                'soundex space str string_agg string_escape string_split stuff substring translate trim unicode upper ' +
                // System functions
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/system-functions-transact-sql
                'binary_checksum checksum compress connectionproperty context_info current_request_id current_transaction_id decompress error_line error_message ' +
                'error_number error_procedure error_severity error_state formatmessage get_filestream_transaction_context getansinull host_id host_name ' +
                'isnull isnumeric min_active_rowversion newid newsequentialid rowcount_big session_context xact_state ' +
                // Text and Image
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/text-and-image-functions-textptr-transact-sql?view=sql-server-2017
                'textptr textvalid ' +
                // Trigger
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/trigger-functions-transact-sql?view=sql-server-2017
                'columns_updated eventdata trigger_nestlevel update ' +
                // XML
                // https://docs.microsoft.com/en-us/sql/t-sql/xml/xml-schema-namespace?view=sql-server-2017
                'xml_schema_namespace'),
            options: set(
                // SET Options
                // https://docs.microsoft.com/en-us/sql/t-sql/statements/set-quoted-identifier-transact-sql?view=sql-server-2017
                'ansi_defaults ansi_null_dflt_off ansi_null_dflt_on ansi_nulls ansi_padding ansi_warnings arithabort arithignore concat_null_yields_null context_info cursor_close_on_commit ' +
                'datefirst dateformat deadlock_priority fips_flagger fmtonly forceplan identity_insert implicit_transactions language lock_timeout nocount noexec ' +
                'numeric_roundabort offsets parseonly query_governor_cost_limit quoted_identifier remote_proc_transactions rowcount showplan_all showplan_text showplan_xml statistics io statistics profile ' +
                'statistics time statistics xml textsize transaction isolation level xact_abort'),
            '@@': set(
                // System functions that begin with @@
                // Configuration
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/configuration-functions-transact-sql
                'dbts langid language lock_timeout max_connections max_precision nestlevel options remserver servername servicename spid textsize version ' +
                // System functions
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/system-functions-transact-sql
                'error identity pack_received rowcount trancount ' +
                // Cursor
                //https://docs.microsoft.com/en-us/sql/t-sql/functions/cursor-functions-transact-sql?view=sql-server-2017
                'cursor_rows fetch_status ' +
                // Date Time
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/date-and-time-data-types-and-functions-transact-sql?view=sql-server-2017
                'datefirst ' +
                // Metadata
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/metadata-functions-transact-sql?view=sql-server-2017
                'procid ' +
                // Statical
                // https://docs.microsoft.com/en-us/sql/t-sql/functions/system-statistical-functions-transact-sql?view=sql-server-2017
                'connections cpu_busy idle io_busy pack_sent packet_errors timeticks total_errors total_read total_write'),
            sysviews: set(
                // https://docs.microsoft.com/en-us/sql/relational-databases/system-catalog-views/catalog-views-transact-sql?view=sql-server-2017
                'sys schemas messages extended_properties ' +
                // Availability groups
                'availability_databases_cluster availability_group_listener_ip_addresses  availability_group_listeners availability_groups availability_groups_cluster availability_read_only_routing_lists availability_replicas ' +
                // Change tracking
                'change_tracking_databases change_tracking_tables ' +
                // CLR Assembly
                'assemblies assembly_files assembly_references trusted_assemblies ' +
                // Data tier
                'sysdac_instances ' +
                // Data Collector
                'syscollector_collection_items  syscollector_collection_sets syscollector_collector_types syscollector_config_store syscollector_execution_log syscollector_execution_log_full syscollector_execution_stats ' +
                // Data Spaces
                'data_spaces destination_data_spaces filegroups partition_schemes ' +
                // Database Mail Views
                'sysmail_allitems sysmail_event_log sysmail_faileditems sysmail_mailattachments sysmail_sentitems sysmail_unsentitems ' +
                // Database Mirroring
                'database_mirroring_witnesses ' +
                // Databases & Files
                'backup_devices databases database_files database_mirroring database_recovery_status database_scoped_configurations database_automatic_tuning_options master_files ' +
                // Endpoints
                'database_mirroring_endpoints endpoints endpoint_webmethods http_endpoints service_broker_endpoints soap_endpoints tcp_endpoints ' +
                // Extended Events
                'database_event_session_targets database_event_session_fields database_event_session_events database_event_session_actions server_event_sessions server_event_session_actions server_event_session_events server_event_session_fields server_event_session_targets ' +
                // External Operations
                'external_tables external_data_sources external_file_formats ' +
                // Filestream & FileTable
                'database_filestream_options filetable_system_defined_objects filetables ' +
                // Full-Text Search & Semantic Search
                'fulltext_catalogs fulltext_document_types fulltext_index_catalog_usages fulltext_index_columns fulltext_index_fragments fulltext_indexes fulltext_languages ' +
                'fulltext_semantic_language_statistics_database fulltext_semantic_languages fulltext_stoplists fulltext_stopwords fulltext_system_stopwords registered_search_properties registered_search_property_lists ' +
                // Linked Servers
                'linked_logins remote_logins servers ' +
                // Object
                'all_columns all_objects all_parameters  all_sql_modules all_views allocation_units assembly_modules check_constraints column_store_dictionaries column_store_row_groups column_store_segments ' +
                'columns computed_columns default_constraints events event_notifications event_notification_event_types extended_procedures external_libraries external_library_files foreign_keys foreign_key_columns ' +
                'function_order_columns hash_indexes identity_columns indexes index_columns index_resumable_operations internal_partitions internal_tables key_constraints masked_columns memory_optimized_tables_internal_attributes ' +
                'module_assembly_usages numbered_procedures numbered_procedure_parameters objects parameters partitions periods plan_guides procedures sequences server_assembly_modules server_events server_event_notifications ' +
                'server_sql_modules server_triggers server_trigger_events sql_dependencies sql_expression_dependencies sql_modules stats stats_columns synonyms system_columns system_objects system_parameters system_sql_modules ' +
                'system_views table_types tables trigger_event_types trigger_events triggers views ' +
                // Partition Function
                'partition_functions partition_parameters partition_range_values ' +
                // Policy-Based Management Views
                'syspolicy_conditions syspolicy_policies syspolicy_policy_execution_history syspolicy_policy_execution_history_details syspolicy_policy_categories syspolicy_policy_category_subscriptions syspolicy_system_health_state ' +
                // Resource Governor
                'resource_governor_configuration resource_governor_external_resource_pools resource_governor_resource_pools resource_governor_workload_groups ' +
                // Query Store
                'database_query_store_options query_context_settings query_store_plan query_store_query query_store_query_text query_store_runtime_stats query_store_wait_stats query_store_runtime_stats_interval ' +
                // Scalar Types
                'assembly_types types type_assembly_usages column_type_usages parameter_type_usages ' +
                // Security
                'asymmetric_keys certificates column_encryption_keys column_encryption_key_values column_master_keys credentials crypt_properties cryptographic_providers database_audit_specifications ' +
                'database_audit_specification_details  database_credentials database_scoped_credentials database_permissions database_principals database_role_members key_encryptions login_token master_key_passwords ' +
                'openkeys securable_classes security_policies security_predicates server_audits server_audit_specifications server_audit_specification_details server_file_audits server_permissions ' +
                'server_principals server_role_members sql_logins symmetric_keys system_components_surface_area_configuration user_token ' +
                // Service Broker
                'conversation_endpoints conversation_groups conversation_priorities message_type_xml_schema_collection_usages remote_service_bindings routes ' +
                'service_contract_message_usages service_contract_usages service_contracts service_message_types service_queue_usages service_queues services transmission_queue ' +
                // Server-wide Configuration
                'configurations time_zone_info traces trace_categories trace_columns trace_events trace_event_bindings trace_subclass_values ' +
                // Spatial Data
                'spatial_index_tessellations spatial_indexes spatial_reference_systems ' +
                // Stretch Database
                'remote_data_archive_databases remote_data_archive_tables ' +
                // System compatibility views
                'sysaltfiles syscacheobjects syscharsets syscolumns syscomments sysconfigures sysconstraints syscurconfigs sysdatabases sysdepends sysdevices sysfilegroups sysfiles ' +
                'sysforeignkeys sysfulltextcatalogs sysindexes sysindexkeys syslanguages syslockinfo syslogins sysmembers sysmessages sysobjects sysoledbusers sysperfinfo syspermissions ' +
                'sysprocesses sysprotects sysreferences sysremotelogins sysservers systypes sysusers'
            ),
            sysprocs: set(
                // https://docs.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/system-stored-procedures-transact-sql?view=sql-server-2017
                // System stored procedures
                'sp_wait_for_database_copy_sync ' +
                // Spatial Indexes
                'sp_help_spatial_geometry_index sp_help_spatial_geometry_index_xml sp_help_spatial_geography_index sp_help_spatial_geography_index_xml sp_help_spatial_geometry_histogram (Trasnact-SQL) sp_help_spatial_geography_histogram ' +
                // Catalog
                'sp_column_privileges sp_columns sp_databases sp_fkeys sp_pkeys sp_server_info sp_special_columns sp_sproc_columns sp_statistics sp_stored_procedures sp_table_privileges sp_tables ' +
                // Change Data Capture
                'sp_cdc_add_job sp_cdc_change_job sp_cdc_cleanup_change_table sp_cdc_disable_db sp_cdc_disable_table sp_cdc_drop_job sp_cdc_enable_db sp_cdc_enable_table sp_cdc_generate_wrapper_function sp_cdc_get_captured_columns sp_cdc_get_ddl_history sp_cdc_help_change_data_capture sp_cdc_help_jobs sp_cdc_scan sp_cdc_start_job sp_cdc_stop_job ' +
                // Cursor
                'sp_cursor_list sp_cursor sp_cursorclose sp_cursorexecute sp_cursorfetch sp_cursoropen sp_cursoroption sp_cursorprepare sp_cursorprepexec sp_cursorunprepare sp_describe_cursor sp_describe_cursor_columns sp_describe_cursor_tables sp_execute sp_prepare (Transact SQL) sp_prepexec sp_prepexecrpc sp_unprepare ' +
                // Data Collector
                'sp_syscollector_create_collection_item sp_syscollector_create_collection_set sp_syscollector_create_collector_type sp_syscollector_delete_collection_item sp_syscollector_delete_collection_set sp_syscollector_delete_collector_type sp_syscollector_delete_execution_log_tree sp_syscollector_disable_collector sp_syscollector_enable_collector sp_syscollector_set_cache_directory sp_syscollector_set_cache_window sp_syscollector_set_warehouse_database_name sp_syscollector_set_warehouse_instance_name sp_syscollector_start_collection_set sp_syscollector_stop_collection_set sp_syscollector_run_collection_set sp_syscollector_update_collection_item sp_syscollector_update_collection_set sp_syscollector_update_collector_type sp_syscollector_upload_collection_set ' +
                // Database Engine
                'sp_add_data_file_recover_suspect_db sp_addextendedproc sp_addextendedproperty sp_add_log_file_recover_suspect_db sp_addmessage sp_addtype sp_addumpdevice sp_altermessage sp_attach_db sp_attach_single_file_db sp_autostats sp_batch_params sp_bindefault sp_bindrule sp_bindsession sp_certify_removable sp_clean_db_free_space sp_clean_db_file_free_space sp_configure sp_control_plan_guide sp_create_plan_guide sp_create_plan_guide_from_handle sp_create_removable sp_createstats sp_datatype_info sp_db_increased_partitions sp_db_vardecimal_storage_format sp_dbcmptlevel sp_dbmmonitoraddmonitoring sp_dbmmonitorchangealert sp_dbmmonitorchangemonitoring sp_dbmmonitordropalert sp_dbmmonitordropmonitoring sp_dbmmonitorhelpalert sp_dbmmonitorhelpmonitoring sp_dbmmonitorresults sp_dbmmonitorupdate sp_dbremove sp_delete_backuphistory sp_delete_database_backuphistory sp_depends sp_describe_first_result_set sp_describe_undeclared_parameters sp_detach_db sp_dropdevice sp_dropextendedproc sp_dropextendedproperty sp_dropmessage sp_droptype sp_estimate_data_compression_savings sp_estimated_rowsize_reduction_for_vardecimal sp_executesql sp_execute_external_script sp_getbindtoken sp_getapplock sp_get_query_template sp_help sp_helpconstraint sp_helpdb sp_helpdevice sp_helpextendedproc sp_helpfile sp_helpfilegroup sp_helpindex sp_helplanguage sp_helpserver sp_helpsort sp_helpstats sp_helptext sp_helptrigger sp_indexoption sp_invalidate_textptr sp_lock sp_monitor sp_procoption sp_recompile sp_refreshsqlmodule sp_refreshview sp_releaseapplock sp_rename sp_renamedb sp_resetstatus sp_rxpredict sp_sequence_get_range sp_server_diagnostics sp_set_session_context sp_setnetname sp_settriggerorder sp_spaceused sp_tableoption sp_unbindefault sp_unbindrule sp_updateextendedproperty sp_updatestats sp_validname sp_who sp_flush_log sp_xtp_bind_db_resource_pool sp_xtp_checkpoint_force_garbage_collection sp_xtp_control_proc_exec_stats sp_xtp_control_query_exec_stats sp_xtp_merge_checkpoint_files sp_xtp_unbind_db_resource_pool ' +
                // Database Mail
                'sp_send_dbmail sysmail_add_account_sp sysmail_add_principalprofile_sp sysmail_add_profile_sp sysmail_add_profileaccount_sp sysmail_configure_sp sysmail_delete_account_sp sysmail_delete_log_sp sysmail_delete_mailitems_sp sysmail_delete_profile_sp sysmail_delete_profileaccount_sp sysmail_help_account_sp sysmail_help_configure_sp sysmail_help_principalprofile_sp sysmail_help_profile_sp sysmail_help_profileaccount_sp sysmail_help_queue_sp sysmail_help_status_sp sysmail_start_sp sysmail_stop_sp sysmail_update_account_sp sysmail_update_principalprofile_sp sysmail_update_profile_sp sysmail_update_profileaccount_sp ' +
                // Database Maintenance Plan
                'sp_add_maintenance_plan sp_add_maintenance_plan_db sp_add_maintenance_plan_job sp_delete_maintenance_plan sp_delete_maintenance_plan_db sp_delete_maintenance_plan_job sp_help_maintenance_plan ' +
                // Distributed Queries
                'sp_addlinkedserver sp_addlinkedsrvlogin sp_catalogs sp_column_privileges_ex sp_columns_ex sp_droplinkedsrvlogin sp_foreignkeys sp_indexes sp_linkedservers sp_primarykeys sp_serveroption sp_table_privileges_ex sp_tables_ex sp_testlinkedserver ' +
                // Filestream & Filetable
                'sp_filestream_force_garbage_collection sp_kill_filestream_non_transacted_handles ' +
                // Full-Text Search & Semantic Search
                'sp_fulltext_catalog sp_fulltext_column sp_fulltext_database sp_fulltext_keymappings sp_fulltext_load_thesaurus_file sp_fulltext_pendingchanges sp_fulltext_semantic_register_language_statistics_db sp_fulltext_semantic_unregister_language_statistics_db sp_fulltext_service sp_fulltext_table sp_help_fulltext_catalogs sp_help_fulltext_catalog_components sp_help_fulltext_catalogs_cursor sp_help_fulltext_columns sp_help_fulltext_columns_cursor sp_help_fulltext_system_components sp_help_fulltext_tables sp_help_fulltext_tables_cursor ' +
                // General Extended
                'xp_cmdshell xp_enumgroups xp_grantlogin xp_logevent xp_loginconfig xp_logininfo xp_msver xp_revokelogin xp_sprintf xp_sqlmaint xp_sscanf ' +
                // Log Shipping
                'sp_add_log_shipping_primary_database sp_add_log_shipping_primary_secondary sp_add_log_shipping_secondary_database sp_add_log_shipping_secondary_primary sp_add_log_shipping_alert_job sp_can_tlog_be_applied sp_change_log_shipping_primary_database sp_change_log_shipping_secondary_database sp_change_log_shipping_secondary_primary sp_cleanup_log_shipping_history sp_delete_log_shipping_secondary_primary sp_delete_log_shipping_secondary_database sp_delete_log_shipping_primary_secondary sp_delete_log_shipping_primary_database sp_delete_log_shipping_alert_job sp_help_log_shipping_alert_job sp_help_log_shipping_monitor sp_help_log_shipping_monitor_primary sp_help_log_shipping_monitor_secondary sp_help_log_shipping_primary_database sp_help_log_shipping_primary_secondary sp_help_log_shipping_secondary_database sp_help_log_shipping_secondary_primary sp_refresh_log_shipping_monitor sp_upgrade_log_shipping ' +
                // Managed Backup
                'managed_backup sp_backup_config_basic sp_backup_config_advanced sp_backup_config_schedule sp_ backup_master_switch sp_set_parameter sp_get_backup_diagnostics sp_backup_on_demand ' +
                // Management Data Warehouse
                'sp_create_snapshot sp_update_data_source sp_add_collector_type sp_remove_collector_type sp_purge_data ' +
                // OLE Automation
                // Object Hierarchy Syntax
                'sp_oacreate sp_oadestroy sp_oageterrorinfo sp_oagetproperty sp_oamethod sp_oasetproperty sp_oastop polybase_join_group sp_polybase_leave_group ' +
                // Policy-Based Management
                'sp_syspolicy_add_policy_category sp_syspolicy_add_policy_category_subscription sp_syspolicy_configure sp_syspolicy_delete_policy_category sp_syspolicy_delete_policy_category_subscription sp_syspolicy_delete_policy_execution_history sp_syspolicy_purge_health_state sp_syspolicy_purge_history sp_syspolicy_rename_condition sp_syspolicy_rename_policy sp_syspolicy_rename_policy_category sp_syspolicy_repair_policy_automation sp_syspolicy_set_config_enabled sp_syspolicy_set_config_history_retention sp_syspolicy_set_log_on_success sp_syspolicy_subscribe_to_policy_category sp_syspolicy_unsubscribe_from_policy_category sp_syspolicy_update_policy_category sp_syspolicy_update_policy_category_subscription ' +
                // Query Store
                'sp_query_store_flush_db sp_query_store_force_plan sp_query_store_remove_plan (Transct-SQL) sp_query_store_remove_query sp_query_store_reset_exec_stats sp_query_store_unforce_plan ' +
                // Replication
                'sp_add_agent_parameter sp_add_agent_profile sp_addarticle sp_adddistpublisher sp_adddistributiondb sp_adddistributor sp_adddynamicsnapshot_job sp_addlogreader_agent sp_addmergealternatepublisher sp_addmergearticle sp_addmergefilter sp_addmergepartition sp_addmergepublication sp_addmergepullsubscription sp_addmergepullsubscription_agent sp_addmergepushsubscription_agent sp_addmergesubscription sp_addpublication sp_addpublication_snapshot sp_addpullsubscription sp_addpullsubscription_agent sp_addpushsubscription_agent sp_addqreader_agent sp_addqueued_artinfo sp_addscriptexec sp_addsubscriber sp_addsubscriber_schedule sp_addsubscription sp_addsynctriggers sp_addtabletocontents sp_adjustpublisheridentityrange sp_article_validation sp_articlecolumn sp_articlefilter sp_articleview sp_attachsubscription sp_browsesnapshotfolder sp_browsemergesnapshotfolder sp_browsereplcmds sp_change_agent_parameter sp_change_agent_profile sp_changearticle sp_changearticlecolumndatatype sp_changedistpublisher sp_changedistributiondb sp_changedistributor_password sp_changedistributor_property sp_changedynamicsnapshot_job sp_changelogreader_agent sp_changemergearticle sp_changemergefilter sp_changemergepublication sp_changemergepullsubscription sp_changemergesubscription sp_changepublication sp_changepublication_snapshot sp_changeqreader_agent sp_changereplicationserverpasswords sp_changesubscriber sp_changesubscriber_schedule sp_changesubscriptiondtsinfo sp_changesubscription sp_changesubstatus sp_change_subscription_properties sp_check_dynamic_filters sp_check_for_sync_trigger sp_check_join_filter sp_check_subset_filter sp_configure_peerconflictdetection sp_copymergesnapshot sp_copysnapshot sp_copysubscription sp_deletemergeconflictrow sp_deletepeerrequesthistory sp_deletetracertokenhistory sp_drop_agent_parameter sp_drop_agent_profile sp_dropanonymousagent sp_droparticle sp_dropdistpublisher sp_dropdistributiondb sp_dropdistributor sp_dropdynamicsnapshot_job sp_dropmergealternatepublisher sp_dropmergearticle sp_dropmergefilter sp_dropmergepartition sp_dropmergepublication sp_dropmergepullsubscription sp_dropmergesubscription sp_droppublication sp_droppullsubscription sp_dropsubscriber sp_dropsubscription sp_dsninfo sp_enumcustomresolvers sp_enumeratependingschemachanges sp_enumdsn sp_expired_subscription_cleanup sp_generatefilters sp_get_distributor sp_get_redirected_publisher sp_getagentparameterlist sp_getdefaultdatatypemapping sp_getmergedeletetype sp_getqueuedrows sp_getsubscriptiondtspackagename sp_gettopologyinfo sp_grant_publication_access sp_help_agent_default sp_help_agent_parameter sp_help_agent_profile sp_help_peerconflictdetection sp_help_publication_access sp_helparticle sp_helparticlecolumns sp_helparticledts sp_helpdatatypemap sp_helpdistpublisher sp_helpdistributiondb sp_helpdistributor sp_helpdistributor_properties sp_helpdynamicsnapshot_job sp_helplogreader_agent sp_helpmergealternatepublisher sp_helpmergearticle sp_helpmergearticlecolumn sp_helpmergearticleconflicts sp_helpmergeconflictrows sp_helpmergedeleteconflictrows sp_helpmergefilter sp_helpmergepartition sp_helpmergepublication sp_helpmergepullsubscription sp_helpmergesubscription sp_helppeerrequests sp_helppeerresponses sp_helppublication sp_helppublication_snapshot sp_helppullsubscription sp_helpqreader_agent sp_helpreplfailovermode sp_helpreplicationdboption sp_helpreplicationoption sp_helpsubscriberinfo sp_helpsubscription sp_helpsubscription_properties sp_helpsubscriptionerrors sp_helptracertokens sp_helptracertokenhistory sp_helpxactsetjob sp_ivindexhasnullcols sp_link_publication sp_lookupcustomresolver sp_markpendingschemachange sp_marksubscriptionvalidation sp_mergearticlecolumn sp_mergecleanupmetadata sp_mergedummyupdate sp_mergemetadataretentioncleanup sp_mergesubscription_cleanup sp_MSchange_distribution_agent_properties sp_MSchange_merge_agent_properties sp_MSchange_logreader_agent_properties sp_MSchange_snapshot_agent_properties sp_posttracertoken sp_publication_validation sp_publisherproperty sp_redirect_publisher sp_refreshsubscriptions sp_register_custom_scripting sp_registercustomresolver sp_reinitmergepullsubscription sp_reinitmergesubscription sp_reinitpullsubscription sp_reinitsubscription sp_removedbreplication sp_removedistpublisherdbreplication sp_repladdcolumn sp_replcmds sp_replcounters sp_repldone sp_repldropcolumn sp_replflush sp_replication_agent_checkup sp_replicationdboption sp_replmonitorchangepublicationthreshold sp_replmonitorhelpmergesession sp_replmonitorhelpmergesessiondetail sp_replmonitorhelppublication sp_replmonitorhelppublicationthresholds sp_replmonitorhelppublisher sp_replmonitorhelpsubscription sp_replmonitorsubscriptionpendingcmds sp_replqueuemonitor sp_replrestart sp_replsetoriginator sp_replshowcmds sp_repltrans sp_requestpeerresponse sp_requestpeertopologyinfo sp_resetsnapshotdeliveryprogress sp_restoredbreplication sp_restoremergeidentityrange sp_resyncmergesubscription sp_revoke_publication_access sp_schemafilter sp_script_synctran_commands sp_scriptdynamicupdproc sp_scriptpublicationcustomprocs sp_scriptsubconflicttable sp_setdefaultdatatypemapping sp_setreplfailovermode sp_setsubscriptionxactseqno sp_showpendingchanges sp_showrowreplicainfo sp_startpublication_snapshot sp_subscription_cleanup sp_table_validation sp_unregister_custom_scripting sp_unregistercustomresolver sp_update_agent_profile sp_validate_redirected_publisher sp_validate_replica_hosts_as_publishers sp_validatemergepublication sp_validatemergesubscription sp_vupgrade_mergeobjects sp_vupgrade_replication ' +
                // Security
                'sp_add_trusted_assembly sp_addapprole sp_addlogin sp_addremotelogin sp_addrole sp_addrolemember sp_addserver sp_addsrvrolemember sp_adduser sp_approlepassword sp_audit_write sp_change_users_login sp_changedbowner sp_changeobjectowner sp_control_dbmasterkey_password sp_dbfixedrolepermission sp_defaultdb sp_defaultlanguage sp_denylogin sp_describe_parameter_encryption sp_drop_trusted_assembly sp_dropalias sp_dropapprole sp_droplogin sp_dropremotelogin sp_droprole sp_droprolemember sp_dropserver sp_dropsrvrolemember sp_dropuser sp_grantdbaccess sp_grantlogin sp_helpdbfixedrole sp_helplinkedsrvlogin sp_helplogins sp_helpntgroup sp_helpremotelogin sp_helprole sp_helprolemember sp_helprotect sp_helpsrvrole sp_helpsrvrolemember sp_helpuser sp_migrate_user_to_contained sp_MShasdbaccess sp_password sp_refresh_parameter_encryption sp_remoteoption sp_revokelogin sp_revokedbaccess sp_setapprole sp_srvrolepermission sp_unsetapprole sp_validatelogins sp_xp_cmdshell_proxy_account sp_delete_backup_file_snapshot sp_delete_backup ' +
                // SQL Server Agent
                'sp_add_alert sp_add_category sp_add_job sp_add_jobschedule sp_add_jobserver sp_add_jobstep sp_add_notification sp_add_operator sp_add_proxy sp_add_schedule sp_add_targetservergroup sp_add_targetsvrgrp_member sp_apply_job_to_targets sp_attach_schedule sp_cycle_agent_errorlog sp_cycle_errorlog sp_delete_alert sp_delete_category sp_delete_job sp_delete_jobschedule sp_delete_jobserver sp_delete_jobstep sp_delete_jobsteplog sp_delete_notification sp_delete_operator sp_delete_proxy sp_delete_schedule sp_delete_targetserver sp_delete_targetservergroup sp_delete_targetsvrgrp_member sp_detach_schedule sp_enum_login_for_proxy sp_enum_proxy_for_subsystem sp_grant_proxy_to_subsystem sp_grant_login_to_proxy sp_help_alert sp_help_category sp_help_downloadlist sp_help_job sp_help_jobactivity sp_help_jobcount sp_help_jobhistory sp_help_jobs_in_schedule sp_help_jobschedule sp_help_jobserver sp_help_jobstep sp_help_jobsteplog sp_help_notification sp_help_operator sp_help_proxy sp_help_schedule sp_help_targetserver sp_help_targetservergroup sp_manage_jobs_by_login sp_msx_defect sp_msx_enlist sp_msx_get_account sp_msx_set_account sp_notify_operator sp_post_msx_operation sp_purge_jobhistory sp_remove_job_from_targets sp_resync_targetserver sp_revoke_login_from_proxy sp_revoke_proxy_from_subsystem sp_start_job sp_stop_job sp_update_alert sp_update_category sp_update_job sp_update_jobschedule sp_update_jobstep sp_update_notification sp_update_operator sp_update_proxy sp_update_schedule sp_update_targetservergroup ' +
                // SQL Server Profiler
                'sp_trace_create sp_trace_generateevent sp_trace_setevent sp_trace_setfilter sp_trace_setstatus ' +
                // Stretch Database Extended
                'sp_rda_deauthorize_db sp_rda_get_rpo_duration sp_rda_reauthorize_db sp_rda_reconcile_batch sp_rda_reconcile_columns sp_rda_reconcile_indexes sp_rda_set_query_mode sp_rda_set_rpo_duration sp_rda_test_connection sp_xtp_flush_temporal_history ' +
                // XML
                'sp_xml_preparedocument sp_xml_removedocument sp_db_selective_xml_index')
        });
    }());
})(CodeMirror);
