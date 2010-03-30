/**
* The class is used to create queued migrations module that is used to show missing file information for the given node.
* The agent logs information is obtained from Phedex database using web APIs provided by Phedex and is formatted to 
* show it to user in a YUI datatable.
* @namespace PHEDEX.Module
* @class QueuedMigrations
* @constructor
* @param sandbox {PHEDEX.Sandbox} reference to a PhEDEx sandbox object
* @param string {string} a string to use as the base-name of the <strong>Id</strong> for this module
*/
PHEDEX.namespace('Module');
PHEDEX.Module.QueuedMigrations = function(sandbox, string) {
    Yla(this, new PHEDEX.DataTable(sandbox, string));

    var _sbx = sandbox, _nodename, _totalsize = 0;
    log('Module: creating a genuine "' + string + '"', 'info', string);

    /**
    * Check if the node name is valid or not i.e should contain either _MSS or _Buffer.
    * @method _isValidNode
    * @param strNodeName {String} node name to be validated.
    * @private
    */
    var _isValidNode = function(strNodeName) {
        var strRegExp = "_MSS|_Buffer";
        var regExpNode = new RegExp(strRegExp);
        if (strNodeName.match(regExpNode)) {
            return true;
        }
        return false;
    };

    /**
    * Get the name of from node i.e in *_Buffer format.
    * @method _getFromNode
    * @param strNodeName {String} input node name.
    * @private
    */
    var _getFromNode = function(strNodeName) {
        var strRegExp = "_Buffer";
        var regExpNode = new RegExp(strRegExp);
        if (strNodeName.match(regExpNode)) {
            return strNodeName;
        }
        else {
            return strNodeName.replace('_MSS', '_Buffer');
        }
    };
    this.allowNotify['parseData'] = 1;

    //Used to construct the queued migrations module.
    _construct = function() {
        return {
            /**
            * Used for styling the elements of the module.
            * @property decorators
            * @type Object[]
            */
            decorators: [
                {
                    name: 'Extra',
                    source: 'component-control',
                    parent: 'control',
                    payload: {
                        target: 'extra',
                        handler: 'fillExtra',
                        animate: false
                    }
                },
                {
                    name: 'cMenuButton',
                    source: 'component-splitbutton',
                    payload: {
                        name: 'Show all fields',
                        map: { hideColumn: 'addMenuItem' },
                        container: 'param'
                    }
                },
                {
                    name: 'ContextMenu',
                    source: 'component-contextmenu',
                    payload: {
                        args: { 'block': 'Name' }
                    }
                }
            ],

            /**
            * Properties used for configuring the module.
            * @property meta
            * @type Object
            */
            meta: {
                ctxArgs: { 'Block Name': 'block' },
                table: {
                    columns: [{ key: 'blockname', label: 'Block Name' },
                              { key: 'fileid', label: 'File ID', className: 'align-right' },
                              { key: 'filename', label: 'File Name' },
                              { key: 'filebytes', label: 'File Size', className: 'align-right', formatter: "customBytes"}]
                },
                hide: ['File ID'],
                sort: { field: 'Block Name' },
                filter: {
                    'QueuedMigrations attributes': {
                        map: { to: 'Q' },
                        fields: {
                            'Block Name': { type: 'regex', text: 'Block Name', tip: 'javascript regular expression' },
                            'File Name': { type: 'regex', text: 'File Name', tip: 'javascript regular expression' },
                            'File Size': { type: 'minmax', text: 'File Size', tip: 'integer range (bytes)' },
                            'File ID': { type: 'int', text: 'File ID', tip: 'ID of file in TMDB' }
                        }
                    }
                }
            },

            /**
            * Processes i.e flatten the response data so as to create a YAHOO.util.DataSource and display it on-screen.
            * @method _processData
            * @param jsonData {object} tabular data (2-d array) used to fill the datatable. The structure is expected to conform to <strong>data[i][key] = value</strong>, where <strong>i</strong> counts the rows, and <strong>key</strong> matches a name in the <strong>columnDefs</strong> for this table.
            * @private
            */
            _processData: function(jsonData) {
                var indx, indxQueues, indxQueue, indxBlock, indxFile, jsonQueues, jsonBlocks, jsonBlock, jsonFile, arrFile, arrData = [],
                arrBlockCols = [{ jsonkey: 'name', dtkey: 'blockname', defval: '' }],
                arrFileCols = [{ jsonkey: 'name', dtkey: 'filename', defval: '' },
                               { jsonkey: 'id', dtkey: 'fileid', defval:0, parser: YAHOO.util.DataSource.parseNumber },
                               { jsonkey: 'bytes', dtkey: 'filebytes', defval:0, parser: YAHOO.util.DataSource.parseNumber}],
                nArrBLen = arrBlockCols.length, nArrFLen = arrFileCols.length,
                _jLen = jsonData.length, jQLen, jBLen, jBfLen, objCol, objVal;
                _totalsize = 0;
                for (indxQueues = 0; indxQueues < jsonData.length; indxQueues++) {
                    jsonQueues = jsonData[indxQueues].transfer_queue;
                    jQLen = jsonQueues.length;
                    for (indxQueue = 0; indxQueue < jQLen; indxQueue++) {
                        jsonBlocks = jsonQueues[indxQueue].block;
                        jBLen = jsonBlocks.length;
                        for (indxBlock = 0; indxBlock < jBLen; indxBlock++) {
                            jsonBlock = jsonBlocks[indxBlock];
                            jBfLen = jsonBlock.file.length;
                            for (indxFile = 0; indxFile < jBfLen; indxFile++) {
                                jsonFile = jsonBlock.file[indxFile];
                                _totalsize = _totalsize + (jsonFile['bytes'] / 1);
                                arrFile = [];
                                for (indx = 0; indx < nArrBLen; indx++) {
                                    objCol = arrBlockCols[indx];
                                    objVal = jsonBlock[objCol.jsonkey];
                                    if (objCol.parser) {
                                        if (typeof objCol.parser == 'function') { objVal = objCol.parser(objVal); }
                                        else { objVal = YAHOO.util.DataSourceBase.Parser[objCol.parser](objVal); }
                                    }
                                    if (!objVal) { objVal = objCol.defval; }
                                    arrFile[objCol.dtkey] = objVal;
                                }
                                for (indx = 0; indx < nArrFLen; indx++) {
                                    objCol = arrFileCols[indx];
                                    objVal = jsonFile[objCol.jsonkey];
                                    if (objCol.parser) {
                                        if (typeof objCol.parser == 'function') { objVal = objCol.parser(objVal); }
                                        else { objVal = YAHOO.util.DataSourceBase.Parser[objCol.parser](objVal); }
                                    }
                                    if (!objVal) { objVal = objCol.defval; }
                                    arrFile[objCol.dtkey] = objVal;
                                }
                                arrData.push(arrFile);
                            }
                        }
                    }
                }
                log("The data has been processed for data source", 'info', this.me);
                this.needProcess = false;
                return arrData;
            },

            /**
            * This inits the Phedex.QueuedMigrations module and notify to sandbox about its status.
            * @method initData
            */
            initData: function() {
                this.dom.title.innerHTML = 'Waiting for parameters to be set...';
                if (_nodename) {
                    _sbx.notify(this.id, 'initData');
                    return;
                }
                _sbx.notify('module', 'needArguments', this.id);
            },

            /** Call this to set the parameters of this module and cause it to fetch new data from the data-service.
            * @method setArgs
            * @param arr {array} object containing arguments for this module. Highly module-specific! For the <strong>QueuedMigrations</strong> module, only <strong>arr.node</strong> is required. <strong>arr</strong> may be null, in which case no data will be fetched.
            */
            setArgs: function(arr) {
                if (!arr) { return; }
                if (!arr.node) { return; }
                if (arr.node == _nodename) { return; }
                _nodename = arr.node;
                this.dom.title.innerHTML = 'setting parameters...';
                _sbx.notify(this.id, 'setArgs');
            },

            /**
            * This gets the queued migrations information from Phedex data service for the given node name through sandbox.
            * @method getData
            */
            getData: function() {
                if (!_nodename) {
                    this.initData();
                    return;
                }
                var strFromNode, strToNode;
                if (_isValidNode(_nodename)) {
                    log('The node is valid. So, fetching data..', 'info', this.me);
                    this.dom.title.innerHTML = this.me + ': fetching data...';
                    strFromNode = _getFromNode(_nodename);
                    strToNode = strFromNode.replace('_Buffer', '_MSS');
                    _sbx.notify(this.id, 'getData', { api: 'transferqueuefiles', args: { from: strFromNode, to: strToNode} });
                }
                else {
                    banner("Invalid node name. Please enter the valid node name.", 'warn');
                    log("Invalid node name. Please enter the valid node name.", 'warn', this.me);
                }
            },

            /**
            * This intitiates processing of queued migrations information obtained from data service.
            * @method gotData
            * @param data {object} queued migration file information in json format.
            */
            gotData: function(data) {
                var strFromNode, strToNode;
                log('Got new data', 'info', this.me);
                this.dom.title.innerHTML = 'Parsing data...';
                this.data = data.link;
                if (!data.link) {
                    throw new Error('data incomplete for ' + context.api);
                }
                _sbx.notify(this.id, 'parseData'); // parsing takes a long time, so update the GUI to let them know why they're waiting...
            },

            /**
            * This processes the data after getting it from data service and shows result in YUI datatable.
            * @method parseData
            */
            parseData: function() {
                this.fillDataSource(this.data);
                strFromNode = _getFromNode(_nodename);
                strToNode = strFromNode.replace('_Buffer', '_MSS');
                this.dom.title.innerHTML = this.data.length + ' missing file(s) for (' + strFromNode + ', ' + strToNode + ') node pair';
                _sbx.notify(this.id, 'gotData');
            },

            /**
            * This updates the extra content with the total size of files that are yet to be migrated.
            * @method fillExtra
            */
            fillExtra: function() {
                this.dom.extra.innerHTML = 'The total size of files yet to be migrated is ' + PHEDEX.Util.format.bytes(_totalsize);
            }
        };
    };
    Yla(this, _construct(), true);
    return this;
};

log('loaded...', 'info', 'queuedmigrations');