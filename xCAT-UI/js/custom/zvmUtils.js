/**
 * Global variables
 */
var diskDatatable; // zVM datatable containing disks
var zfcpDatatable; // zVM datatable containing zFCP devices
var networkDatatable; // zVM datatable containing networks

/**
 * Get the disk datatable
 * 
 * @return Data table object
 */
function getDiskDataTable() {
    return diskDatatable;
}

/**
 * Set the disk datatable
 * 
 * @param table Data table object
 */
function setDiskDataTable(table) {
    diskDatatable = table;
}

/**
 * Get the zFCP datatable
 * 
 * @return Data table object
 */
function getZfcpDataTable() {
    return zfcpDatatable;
}

/**
 * Set the zFCP datatable
 * 
 * @param table Data table object
 */
function setZfcpDataTable(table) {
	zfcpDatatable = table;
}

/**
 * Get the network datatable
 * 
 * @return Data table object
 */
function getNetworkDataTable() {
    return networkDatatable;
}

/**
 * Set the network datatable
 * 
 * @param table Data table object
 */
function setNetworkDataTable(table) {
    networkDatatable = table;
}

/**
 * Load HCP specific info
 * 
 * @param data Data from HTTP request
 */
function loadHcpInfo(data) {
    var args = data.msg.split(';');
    
    // Get group
    var group = args[0].replace('group=', '');
    // Get hardware control point
    var hcp = args[1].replace('hcp=', '');
    
    // Get user directory entry
    var userEntry = data.rsp;
    if (userEntry[0].indexOf('Failed') < 0) {
        if (hcp) {
            // If there is no cookie for the disk pool names
            if (!$.cookie(hcp + 'diskpools')) {
                // Get disk pools
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--diskpoolnames',
                        msg : hcp
                    },
            
                    success : setDiskPoolCookies
                });
            }
            
            // If there is no cookie for the zFCP pool names
            if (!$.cookie(hcp + 'zfcppools')) {
                // Get disk pools
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--zfcppoolnames',
                        msg : hcp
                    },
            
                    success : setZfcpPoolCookies
                });
            }
        
            // If there is no cookie for the network names
            if (!$.cookie(hcp + 'networks')) {
                // Get network names
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--getnetworknames',
                        msg : hcp
                    },
            
                    success : setNetworkCookies
                });
            }
        } // End of if (hcp)
    } else {
        // Create warning dialog
        var warning = createWarnBar('z/VM SMAPI is not responding to ' + hcp + '.  It needs to be reset.');
        var warnDialog = $('<div></div>').append(warning);
                        
        // Open dialog
        warnDialog.dialog({
            title:'Warning',
            modal: true,
            close: function(){
                $(this).remove();
            },
            width: 400,
            buttons: {
                "Reset": function(){
                    $(this).dialog("close");    
                    
                    // Reset SMAPI
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : hcp,
                            args : '--resetsmapi',
                            msg : 'group=' + group + ';hcp=' + hcp
                        },
                
                        /**
                         * Refresh group tab
                         * 
                         * @param data
                         *            Data from HTTP request
                         * @return Nothing
                         */
                        success : function(data) {                            
                            var args = data.msg.split(';');
                            
                            // Get group
                            var group = args[0].replace('group=', '');
                            
                            // Clear nodes division
                            $('#nodes').children().remove();
                            // Create loader
                            var loader = $('<center></center>').append(createLoader());
            
                            // Create a tab for this group
                            var tab = new Tab();
                            setNodesTab(tab);
                            tab.init();
                            $('#nodes').append(tab.object());
                            tab.add('nodesTab', 'Nodes', loader, false);
            
                            // Get nodes within selected group
                            $.ajax( {
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'lsdef',
                                    tgt : '',
                                    args : group,
                                    msg : group
                                },
            
                                success : loadNodes
                            });
                        } // End of function
                    });
                },
        
                "Ignore": function() {
                    $(this).dialog("close");
                }
            }
        });
    }
}

/**
 * Load user entry of a given node
 * 
 * @param data Data from HTTP request
 */
function loadUserEntry(data) {
    var args = data.msg.split(';');

    // Get tab ID
    var ueDivId = args[0].replace('out=', '');
    // Get node
    var node = args[1].replace('node=', '');
    // Get user directory entry
    var userEntry = data.rsp[0].split(node + ':');

    // Remove loader
    $('#' + node + 'TabLoader').remove();

    var toggleLinkId = node + 'ToggleLink';
    $('#' + toggleLinkId).click(function() {
        // Get text within this link
        var lnkText = $(this).text();

        // Toggle user entry division
        $('#' + node + 'UserEntry').toggle();
        // Toggle inventory division
        $('#' + node + 'Inventory').toggle();

        // Change text
        if (lnkText == 'Show directory entry') {
            $(this).text('Show inventory');
        } else {
            $(this).text('Show directory entry');
        }
    });

    // Put user entry into a list
    var fieldSet = $('<fieldset></fieldset>');
    var legend = $('<legend>Directory Entry</legend>');
    fieldSet.append(legend);

    var txtArea = $('<textarea></textarea>');
    for ( var i = 1; i < userEntry.length; i++) {
        userEntry[i] = jQuery.trim(userEntry[i]);
        txtArea.append(userEntry[i]);

        if (i < userEntry.length) {
            txtArea.append('\n');
        }
    }
    txtArea.attr('readonly', 'readonly');
    fieldSet.append(txtArea);

    /**
     * Edit user entry
     */
    txtArea.bind('dblclick', function(event) {
        txtArea.attr('readonly', '');
        txtArea.css( {
            'border-width' : '1px'
        });

        saveBtn.show();
        cancelBtn.show();
        saveBtn.css('display', 'inline-table');
        cancelBtn.css('display', 'inline-table');
    });
    
    /**
     * Save
     */
    var saveBtn = createButton('Save').hide();
    saveBtn.bind('click', function(event) {
        // Show loader
        $('#' + node + 'StatusBarLoader').show();
        $('#' + node + 'StatusBar').show();

        // Replace user entry
        var newUserEntry = jQuery.trim(txtArea.val()) + '\n';

        // Replace user entry
        $.ajax( {
            url : 'lib/zCmd.php',
            dataType : 'json',
            data : {
                cmd : 'chvm',
                tgt : node,
                args : '--replacevs',
                att : newUserEntry,
                msg : node
            },

            success : updateZNodeStatus
        });

        // Increment node process and save it in a cookie
        incrementNodeProcess(node);

        txtArea.attr('readonly', 'readonly');
        txtArea.css( {
            'border-width' : '0px'
        });

        // Disable save button
        $(this).hide();
        cancelBtn.hide();
    });

    /**
     * Cancel
     */
    var cancelBtn = createButton('Cancel').hide();
    cancelBtn.bind('click', function(event) {
        txtArea.attr('readonly', 'readonly');
        txtArea.css( {
            'border-width' : '0px'
        });

        cancelBtn.hide();
        saveBtn.hide();
    });

    // Create info bar
    var infoBar = createInfoBar('Double click on the directory entry to edit it.');

    // Append user entry into division
    $('#' + ueDivId).append(infoBar);
    $('#' + ueDivId).append(fieldSet);
    $('#' + ueDivId).append(saveBtn);
    $('#' + ueDivId).append(cancelBtn);
}

/**
 * Increment number of processes running against a node
 * 
 * @param node Node to increment running processes
 */
function incrementNodeProcess(node) {
    // Get current processes
    var procs = $.cookie(node + 'processes');
    if (procs) {
        // One more process
        procs = parseInt(procs) + 1;
        $.cookie(node + 'processes', procs);
    } else {
        $.cookie(node + 'processes', 1);
    }
}

/**
 * Update provision new node status
 * 
 * @param data Data returned from HTTP request
 */
function updateZProvisionNewStatus(data) {
    // Parse ajax response
    var rsp = data.rsp;
    var args = data.msg.split(';');
    var lastCmd = args[0].replace('cmd=', '');
    var out2Id = args[1].replace('out=', '');
    
    // IDs for status bar, tab, and loader
    var statBarId = 'zProvisionStatBar' + out2Id;
    var tabId = 'zvmProvisionTab' + out2Id;
    var loaderId = 'zProvisionLoader' + out2Id;

    var node = $('#' + tabId + ' input[name=nodeName]').val();

    /**
     * (2) Create user entry
     */
    if (lastCmd == 'nodeadd') {
    	if (rsp.length) {
            $('#' + loaderId).hide();
            $('#' + statBarId).find('div').append('<pre>(Error) Failed to create node definition</pre>');
        } else {
        	$('#' + statBarId).find('div').append('<pre>Node definition created for ' + node + '</pre>');
            
	        // Write ajax response to status bar
	        var prg = writeRsp(rsp, '');    
	        $('#' + statBarId).find('div').append(prg);
	        
	        // Create user entry
	        var userEntry = $('#' + tabId + ' textarea').val();
	        $.ajax( {
	            url : 'lib/zCmd.php',
	            dataType : 'json',
	            data : {
	                cmd : 'mkvm',
	                tgt : node,
	                args : '',
	                att : userEntry,
	                msg : 'cmd=mkvm;out=' + out2Id
	            },
	
	            success : updateZProvisionNewStatus
	        });
        }
    }
    
    /**
     * (3) Update /etc/hosts
     */
    else if (lastCmd == 'mkvm') {
    	// Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + statBarId).find('div').append(prg);
        
    	// If there was an error, quit
        if (containErrors(prg.html())) {
            $('#' + loaderId).hide();
        } else {
            $.ajax({
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'makehosts',
                    tgt : '',
                    args : '',
                    msg : 'cmd=makehosts;out=' + out2Id
                },
    
                success : updateZProvisionNewStatus
            });
        }
    }

    /**
     * (4) Update DNS
     */
    else if (lastCmd == 'makehosts') {
        // If there was an error, quit
        if (rsp.length) {
            $('#' + loaderId).hide();
            $('#' + statBarId).find('div').append('<pre>(Error) Failed to update /etc/hosts</pre>');
        } else {
            $('#' + statBarId).find('div').append('<pre>/etc/hosts updated</pre>');
            $.ajax({
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'makedns',
                    tgt : '',
                    args : '',
                    msg : 'cmd=makedns;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }        
    }

    /**
     * (5) Add disk
     */
    else if (lastCmd == 'makedns') {        
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + statBarId).find('div').append(prg);

        // If there was an error, quit
        if (containErrors(prg.html())) {
            $('#' + loaderId).hide();
        } else {
            // Set cookie for number of disks
            var diskRows = $('#' + tabId + ' table:eq(0):visible tbody tr');
            $.cookie('disks2add' + out2Id, diskRows.length);
            if (diskRows.length > 0) {
                for ( var i = 0; i < diskRows.length; i++) {
                    var diskArgs = diskRows.eq(i).find('td');
                    var type = diskArgs.eq(1).find('select').val();
                    var address = diskArgs.eq(2).find('input').val();
                    var size = diskArgs.eq(3).find('input').val();
                    var mode = diskArgs.eq(4).find('select').val();
                    var pool = diskArgs.eq(5).find('select').val();
                    var password = diskArgs.eq(6).find('input').val();
                    
                    // Create ajax arguments
                    var args = '';
                    if (type == '3390') {
                        args = '--add' + type + ';' + pool + ';' + address
                            + ';' + size + ';' + mode + ';' + password + ';'
                            + password + ';' + password;
                    } else if (type == '9336') {
                        var blkSize = '512';
                        args = '--add' + type + ';' + pool + ';' + address + ';' 
                            + blkSize + ';' + size + ';' + mode + ';' + password + ';'
                            + password + ';' + password;
                    }
                    
                    // Attach disk to node
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : args,
                            msg : 'cmd=chvm-disk;out=' + out2Id
                        },

                        success : updateZProvisionNewStatus
                    });
                }
            } 
            
            // Set cookie for number of zFCP devices
            var zfcpRows = $('#' + tabId + ' table:eq(1):visible tbody tr');
            $.cookie('zfcp2add' + out2Id, zfcpRows.length);
            if (zfcpRows.length > 0) {
            	for ( var i = 0; i < zfcpRows.length; i++) {
                    var diskArgs = zfcpRows.eq(i).find('td');
                    var address = diskArgs.eq(1).find('input').val();
                    var size = diskArgs.eq(2).find('input').val();
                    var pool = diskArgs.eq(3).find('select').val();
                    var tag = diskArgs.eq(4).find('input').val();
                    var portName = diskArgs.eq(5).find('input').val();
                    var unitNo = diskArgs.eq(6).find('input').val();
                    
                    // This is either true or false
                    var loaddev = diskArgs.eq(7).find('input').attr('checked');
                    if (loaddev) {
                    	loaddev = "1";
                    } else {
                    	loaddev = "0";
                    }                   
                    
                    // Create ajax arguments
                    var args = '--addzfcp;' + pool + ';' + address + ';' + loaddev + ';' + size;
                    if (tag && tag != "null") {
                        args += ';' + tag;
                    } if (portName && tag != "null") {
                        args += ';' + portName;
                    } if (unitNo && tag != "null") {
                        args += ';' + unitNo;
                    }

                    // Attach zFCP device to node
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : args,
                            msg : 'cmd=chvm-zfcp;out=' + out2Id
                        },

                        success : updateZProvisionNewStatus
                    });
                }
            }
            
            // Done if no disks to add
            var zfcp2add = $.cookie('zfcp2add' + out2Id);
            var zfcp2add = $.cookie('zfcp2add' + out2Id);
            if (disks2add < 1 && zfcp2add < 1) {
                $('#' + loaderId).hide();
            }
        }
    }
    
    /**
     * (6) Set operating system for given node
     */
    else if (lastCmd == 'chvm-disk' || lastCmd == 'chvm-zfcp') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + statBarId).find('div').append(prg);

        // If there was an error, quit
        if (containErrors(prg.html())) {
            $('#' + loaderId).hide();
        } else {
        	// Set cookie for number of disks
            // One less disk to add
        	var disks2add = $.cookie('disks2add' + out2Id);
        	if (lastCmd == 'chvm-disk') {
	            if (disks2add > 0) {
	            	disks2add--;            
	            	$.cookie('disks2add' + out2Id, disks2add);
	            }
        	}
            
        	var zfcp2add = $.cookie('zfcp2add' + out2Id);
        	if (lastCmd == 'chvm-zfcp') {	            
	            if (zfcp2add > 0) {
	            	zfcp2add--;
	            	$.cookie('zfcp2add' + out2Id, zfcp2add);
	            }
        	}
            
        	// Only set operating system if there are no more disks to add
            if (zfcp2add < 1 && disks2add < 1) {                
                // If an operating system image is given
            	var osImage = $('#' + tabId + ' select[name=os]:visible').val();
                if (osImage) {
                	// Get operating system, architecture, provision method, and profile
                    var tmp = osImage.split('-');
                    var os = tmp[0];
                    var arch = tmp[1];
                    var profile = tmp[3];

                    // If the last disk is added
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'nodeadd',
                            tgt : '',
                            args : node + ';noderes.netboot=zvm;nodetype.os='
                                + os + ';nodetype.arch=' + arch
                                + ';nodetype.profile=' + profile,
                            msg : 'cmd=noderes;out=' + out2Id
                        },

                        success : updateZProvisionNewStatus
                    });
                } else {
                    $('#' + loaderId).hide();
                }
            }
        }
    }

    /**
     * (7) Update DHCP
     */
    else if (lastCmd == 'noderes') {
        // If there was an error, do not continue
        if (rsp.length) {
            $('#' + loaderId).hide();
            $('#' + statBarId).find('div').append('<pre>(Error) Failed to set operating system</pre>');
        } else {
            $('#' + statBarId).find('div').append('<pre>Operating system for ' + node + ' set</pre>');
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'makedhcp',
                    tgt : '',
                    args : '-a',
                    msg : 'cmd=makedhcp;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }
    }

    /**
     * (8) Prepare node for boot
     */
    else if (lastCmd == 'makedhcp') {        
        // Prepare node for boot
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'nodeset',
                tgt : node,
                args : 'install',
                msg : 'cmd=nodeset;out=' + out2Id
            },

            success : updateZProvisionNewStatus
        });
    }

    /**
     * (9) Boot node to network
     */
    else if (lastCmd == 'nodeset') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + statBarId).find('div').append(prg);
        
        // If there was an error
        // Do not continue
        if (containErrors(prg.html())) {
            $('#' + loaderId).hide();
        } else {
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'rnetboot',
                    tgt : node,
                    args : 'ipl=000C',
                    msg : 'cmd=rnetboot;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }
    }

    /**
     * (10) Done
     */
    else if (lastCmd == 'rnetboot') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + statBarId).find('div').append(prg);
        if (prg.html().indexOf('Error') < 0) {
            $('#' + statBarId).find('div').append('<pre>Open a VNC viewer to see the installation progress.  It might take a couple of minutes before you can connect.</pre>');
        }

        // Hide loader
        $('#' + loaderId).hide();
    }
}

/**
 * Update the provision existing node status
 * 
 * @param data Data returned from HTTP request
 */
function updateZProvisionExistingStatus(data) {
    // Get ajax response
    var rsp = data.rsp;
    var args = data.msg.split(';');

    // Get command invoked
    var cmd = args[0].replace('cmd=', '');
    // Get provision tab instance
    var inst = args[1].replace('out=', '');
    
    // Get provision tab and status bar ID
    var statBarId = 'zProvisionStatBar' + inst;
    var tabId = 'zvmProvisionTab' + inst;
    
    /**
     * (2) Prepare node for boot
     */
    if (cmd == 'nodeadd') {
        // Get operating system
        var bootMethod = $('#' + tabId + ' select[name=bootMethod]').val();
        
        // Get nodes that were checked
        var dTableId = 'zNodesDatatable' + inst;
        var tgts = getNodesChecked(dTableId);
        
        // Prepare node for boot
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'nodeset',
                tgt : tgts,
                args : bootMethod,
                msg : 'cmd=nodeset;out=' + inst
            },

            success : updateZProvisionExistingStatus
        });
    } 
    
    /**
     * (3) Boot node from network
     */
    else if (cmd == 'nodeset') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + statBarId).find('div').append(prg);

        // If there was an error, do not continue
        if (containErrors(prg.html())) {
            var loaderId = 'zProvisionLoader' + inst;
            $('#' + loaderId).remove();
            return;
        }
                
        // Get nodes that were checked
        var dTableId = 'zNodesDatatable' + inst;
        var tgts = getNodesChecked(dTableId);
        
        // Boot node from network
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'rnetboot',
                tgt : tgts,
                args : 'ipl=000C',
                msg : 'cmd=rnetboot;out=' + inst
            },

            success : updateZProvisionExistingStatus
        });
    } 
    
    /**
     * (4) Done
     */
    else if (cmd == 'rnetboot') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + statBarId).find('div').append(prg);
        
        var loaderId = 'zProvisionLoader' + inst;
        $('#' + loaderId).remove();
    }
}

/**
 * Update zVM node status
 * 
 * @param data Data returned from HTTP request
 */
function updateZNodeStatus(data) {
    var node = data.msg;
    var rsp = data.rsp;

    // Get cookie for number processes performed against this node
    var actions = $.cookie(node + 'processes');
    // One less process
    actions = actions - 1;
    $.cookie(node + 'processes', actions);
    
    if (actions < 1) {
        // Hide loader when there are no more processes
        var statusBarLoaderId = node + 'StatusBarLoader';
        $('#' + statusBarLoaderId).hide();
    }

    var statBarId = node + 'StatusBar';
    
    // Write ajax response to status bar
    var prg = writeRsp(rsp, '[A-Za-z0-9._-]+:');    
    $('#' + statBarId).find('div').append(prg);    
}

/**
 * Update clone status
 * 
 * @param data Data returned from HTTP request
 */
function updateZCloneStatus(data) {
    // Get ajax response
    var rsp = data.rsp;
    var args = data.msg.split(';');
    var cmd = args[0].replace('cmd=', '');

    // Get provision instance
    var inst = args[1].replace('inst=', '');
    // Get output division ID
    var out2Id = args[2].replace('out=', '');

    /**
     * (2) Update /etc/hosts
     */
    if (cmd == 'nodeadd') {
        var node = args[3].replace('node=', '');

        // If there was an error, do not continue
        if (rsp.length) {
            $('#' + out2Id).find('img').hide();
            $('#' + out2Id).find('div').append('<pre>(Error) Failed to create node definition</pre>');
        } else {
            $('#' + out2Id).find('div').append('<pre>Node definition created for ' + node + '</pre>');
            
            // If last node definition was created
            var tmp = inst.split('/');
            if (tmp[0] == tmp[1]) {
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'makehosts',
                        tgt : '',
                        args : '',
                        msg : 'cmd=makehosts;inst=' + inst + ';out=' + out2Id
                    },

                    success : updateZCloneStatus
                });
            }
        }        
    }

    /**
     * (3) Update DNS
     */
    else if (cmd == 'makehosts') {
        // If there was an error, do not continue
        if (rsp.length) {
            $('#' + out2Id).find('img').hide();
            $('#' + out2Id).find('div').append('<pre>(Error) Failed to update /etc/hosts</pre>');
        } else {
            $('#' + out2Id).find('div').append('<pre>/etc/hosts updated</pre>');
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'makedns',
                    tgt : '',
                    args : '',
                    msg : 'cmd=makedns;inst=' + inst + ';out=' + out2Id
                },

                success : updateZCloneStatus
            });
        }        
    }

    /**
     * (4) Clone
     */
    else if (cmd == 'makedns') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + out2Id).find('div').append(prg);
    
        // Get clone tab
        var tabId = out2Id.replace('CloneStatusBar', 'CloneTab');

        // If a node range is given
        var tgtNodeRange = $('#' + tabId + ' input[name=tgtNode]').val();
        var tgtNodes = '';
        if (tgtNodeRange.indexOf('-') > -1) {
            var tmp = tgtNodeRange.split('-');
            
            // Get node base name
            var nodeBase = tmp[0].match(/[a-zA-Z]+/);
            // Get the starting index
            var nodeStart = parseInt(tmp[0].match(/\d+/));
            // Get the ending index
            var nodeEnd = parseInt(tmp[1].match(/\d+/));
            for ( var i = nodeStart; i <= nodeEnd; i++) {
                // Do not append comma for last node
                if (i == nodeEnd) {
                    tgtNodes += nodeBase + i.toString();
                } else {
                    tgtNodes += nodeBase + i.toString() + ',';
                }
            }
        } else {
            tgtNodes = tgtNodeRange;
        }
        
        // Get other inputs
        var srcNode = $('#' + tabId + ' input[name=srcNode]').val();
        hcp = $('#' + tabId + ' input[name=newHcp]').val();
        var group = $('#' + tabId + ' input[name=newGroup]').val();
        var diskPool = $('#' + tabId + ' input[name=diskPool]').val();
        var diskPw = $('#' + tabId + ' input[name=diskPw]').val();
        if (!diskPw) {
            diskPw = '';
        }

        // Clone
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'mkvm',
                tgt : tgtNodes,
                args : srcNode + ';pool=' + diskPool + ';pw=' + diskPw,
                msg : 'cmd=mkvm;inst=' + inst + ';out=' + out2Id
            },

            success : updateZCloneStatus
        });
    }

    /**
     * (5) Done
     */
    else if (cmd == 'mkvm') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');    
        $('#' + out2Id).find('div').append(prg);
        
        // Hide loader
        $('#' + out2Id).find('img').hide();
    }
}

/**
 * Get zVM resources
 * 
 * @param data Data from HTTP request
 */
function getZResources(data) {
    // Do not continue if there is no output
    if (data.rsp) {
        // Push hardware control points into an array
        var node, hcp;
        var hcpHash = new Object();
        for (var i in data.rsp) {
            node = data.rsp[i][0];
            hcp = data.rsp[i][1];
            hcpHash[hcp] = 1;
        }

        // Create an array for hardware control points
        var hcps = new Array();
        for (var key in hcpHash) {
            // Get the short host name
            hcp = key.split('.')[0];
            hcps.push(hcp);
        }

        // Set hardware control point cookie
        $.cookie('hcp', hcps);
                        
        // Delete loader
        var tabId = 'zvmResourceTab';
        $('#' + tabId).find('img[src="images/loader.gif"]').remove();
        
        // Create accordion panel for disk
        var resourcesAccordion = $('<div id="zvmResourceAccordion"></div>');
        var diskSection = $('<div id="zvmDiskResource"></div>');
        var diskLnk = $('<h3><a href="#">Disks</a></h3>').click(function () {
            // Do not load panel again if it is already loaded
            if ($('#zvmDiskResource').children().length)
                return;
            else
                $('#zvmDiskResource').append(createLoader(''));
                    
            // Resize accordion
            $('#zvmResourceAccordion').accordion('resize');
            
            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1)
                hcps = $.cookie('hcp').split(',');
            else
                hcps.push($.cookie('hcp'));
            
            // Query the disk pools for each
            for (var i in hcps) {
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--diskpoolnames',
                        msg : hcps[i]
                    },

                    success : getDiskPool
                });
            }            
        });
        
        // Create accordion panel for zFCP devices
        var zfcpSection = $('<div id="zfcpResource"></div>');
        var zfcpLnk = $('<h3><a href="#">zFCP</a></h3>').click(function () {
            // Do not load panel again if it is already loaded
            if ($('#zfcpResource').children().length)
                return;
            else
                $('#zfcpResource').append(createLoader(''));
            
            // Resize accordion
            $('#zvmResourceAccordion').accordion('resize');
            
            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1)
                hcps = $.cookie('hcp').split(',');
            else
                hcps.push($.cookie('hcp'));
            
            for ( var i in hcps) {
                // Gather networks from hardware control points
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--zfcppoolnames',
                        msg : hcps[i]
                    },

                    success : getZfcpPool
                });
            }
        });        
        
        // Create accordion panel for network
        var networkSection = $('<div id="zvmNetworkResource"></div>');
        var networkLnk = $('<h3><a href="#">Networks</a></h3>').click(function () {
            // Do not load panel again if it is already loaded
            if ($('#zvmNetworkResource').children().length)
                return;
            else
                $('#zvmNetworkResource').append(createLoader(''));
            
            // Resize accordion
            $('#zvmResourceAccordion').accordion('resize');
            
            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1)
                hcps = $.cookie('hcp').split(',');
            else
                hcps.push($.cookie('hcp'));
            
            for ( var i in hcps) {
                // Gather networks from hardware control points
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--getnetworknames',
                        msg : hcps[i]
                    },

                    success : getNetwork
                });
            }
        });        
        
        resourcesAccordion.append(diskLnk, diskSection, zfcpLnk, zfcpSection, networkLnk, networkSection);
        
        // Append accordion to tab
        $('#' + tabId).append(resourcesAccordion);
        resourcesAccordion.accordion();        
        diskLnk.trigger('click');
    }
}

/**
 * Get node attributes from HTTP request data
 * 
 * @param propNames Hash table of property names
 * @param keys Property keys
 * @param data Data from HTTP request
 * @return Hash table of property values
 */
function getAttrs(keys, propNames, data) {
    // Create hash table for property values
    var attrs = new Object();

    // Go through inventory and separate each property out
    var curKey = null; // Current property key
    var addLine; // Add a line to the current property?
    for ( var i = 1; i < data.length; i++) {
        addLine = true;

        // Loop through property keys
        // Does this line contains one of the properties?
        for ( var j = 0; j < keys.length; j++) {
            // Find property name
            if (data[i].indexOf(propNames[keys[j]]) > -1) {
                attrs[keys[j]] = new Array();

                // Get rid of property name in the line
                data[i] = data[i].replace(propNames[keys[j]], '');
                // Trim the line
                data[i] = jQuery.trim(data[i]);

                // Do not insert empty line
                if (data[i].length > 0) {
                    attrs[keys[j]].push(data[i]);
                }

                curKey = keys[j];
                addLine = false; // This line belongs to a property
            }
        }

        // Line does not contain a property
        // Must belong to previous property
        if (addLine && data[i].length > 1) {
            data[i] = jQuery.trim(data[i]);
            attrs[curKey].push(data[i]);
        }
    }

    return attrs;
}

/**
 * Create add processor dialog
 * 
 * @param node Node to add processor to
 */
function openAddProcDialog(node) {    
    // Create form to add processor
    var addProcForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a temporary processor to this virtual server.');
    addProcForm.append(info);
    addProcForm.append('<div><label for="procNode">Node:</label><input type="text" readonly="readonly" id="procNode" name="procNode" value="' + node + '"/></div>');
    addProcForm.append('<div><label for="procAddress">Processor address:</label><input type="text" id="procAddress" name="procAddress"/></div>');
    
    // Create drop down for processor type
    var procType = $('<div></div>');
    procType.append('<label for="procType">Processor type:</label>');
    var typeSelect = $('<select id="procType" name="procType"></select>');
    typeSelect.append('<option>CP</option>'
        + '<option>IFL</option>'
        + '<option>ZAAP</option>'
        + '<option>ZIIP</option>'
    );
    procType.append(typeSelect);
    addProcForm.append(procType);
    
    // Open dialog to add processor
    addProcForm.dialog({
        title:'Add processor',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                // Get inputs
                var node = $(this).find('input[name=procNode]').val();
                var address = $(this).find('input[name=procAddress]').val();
                var type = $(this).find('select[name=procType]').val();
                
                // If inputs are not complete, show warning message
                if (!node || !address || !type) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Add processor
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : '--addprocessoractive;' + address + ';' + type,
                            msg : node
                        },
    
                        success : updateZNodeStatus
                    });
    
                    // Increment node process
                    incrementNodeProcess(node);
    
                    // Show loader
                    var statusId = node + 'StatusBar';
                    var statusBarLoaderId = node + 'StatusBarLoader';
                    $('#' + statusBarLoaderId).show();
                    $('#' + statusId).show();
                    
                    // Close dialog
                    $(this).dialog( "close" );
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add disk dialog
 * 
 * @param node Node to add disk to
 * @param hcp Hardware control point of node
 */
function openAddDiskDialog(node, hcp) {
    // Get list of disk pools
    var cookie = $.cookie(hcp + 'diskpools');
    var pools = cookie.split(',');
    
    // Create form to add disk
    var addDiskForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a ECKD|3390 or FBA|9336 disk to this virtual server.');
    addDiskForm.append(info);
    addDiskForm.append('<div><label for="diskNode">Node:</label><input type="text" readonly="readonly" id="diskNode" name="diskNode" value="' + node + '"/></div>');
    addDiskForm.append('<div><label for="diskType">Disk type:</label><select id="diskType" name="diskType"><option value="3390">3390</option><option value="9336">9336</option></select></div>');
    addDiskForm.append('<div><label for="diskAddress">Disk address:</label><input type="text" id="diskAddress" name="diskAddress"/></div>');
    addDiskForm.append('<div><label for="diskSize">Disk size:</label><input type="text" id="diskSize" name="diskSize"/></div>');
    
    // Create drop down for disk pool
    var diskPool = $('<div></div>');
    diskPool.append('<label for="diskPool">Disk pool:</label>');
    var poolSelect = $('<select id="diskPool" name="diskPool"></select>');
    for ( var i = 0; i < pools.length; i++) {
        poolSelect.append('<option>' + pools[i] + '</option>');
    }
    diskPool.append(poolSelect);
    addDiskForm.append(diskPool);

    // Create drop down for disk mode
    var diskMode = $('<div></div>');
    diskMode.append('<label for="diskMode">Disk mode:</label>');
    var modeSelect = $('<select id="diskMode" name="diskMode"></select>');
    modeSelect.append('<option>R</option>'
        + '<option>RR</option>'
        + '<option>W</option>'
        + '<option>WR</option>'
        + '<option>M</option>'
        + '<option>MR</option>'
        + '<option>MW</option>'
    );
    diskMode.append(modeSelect);
    addDiskForm.append(diskMode);

    addDiskForm.append('<div><label for="diskPassword">Disk password:</label><input type="password" id="diskPassword" name="diskPassword"/></div>');

    // Open dialog to add disk
    addDiskForm.dialog({
        title:'Add disk',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                // Get inputs
                var node = $(this).find('input[name=diskNode]').val();
                var type = $(this).find('select[name=diskType]').val();
                var address = $(this).find('input[name=diskAddress]').val();
                var size = $(this).find('input[name=diskSize]').val();
                var pool = $(this).find('select[name=diskPool]').val();
                var mode = $(this).find('select[name=diskMode]').val();
                var password = $(this).find('input[name=diskPassword]').val();
                
                // If inputs are not complete, show warning message
                if (!node || !type || !address || !size || !pool || !mode) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Add disk
                    if (type == '3390') {
                        $.ajax( {
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chvm',
                                tgt : node,
                                args : '--add3390;' + pool + ';' + address + ';' + size
                                    + ';' + mode + ';' + password + ';' + password + ';' + password,
                                msg : node
                            },
    
                            success : updateZNodeStatus
                        });
    
                        // Increment node process
                        incrementNodeProcess(node);
    
                        // Show loader
                        var statusId = node + 'StatusBar';
                        var statusBarLoaderId = node + 'StatusBarLoader';
                        $('#' + statusBarLoaderId).show();
                        $('#' + statusId).show();
                    } else if (type == '9336') {
                        // Default block size for FBA volumes = 512
                        var blkSize = '512';
                        
                        $.ajax( {
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chvm',
                                tgt : node,
                                args : '--add9336;' + pool + ';' + address + ';' + blkSize + ';' + size
                                    + ';' + mode + ';' + password + ';' + password + ';' + password,
                                msg : node
                            },
    
                            success : updateZNodeStatus
                        });
    
                        // Increment node process
                        incrementNodeProcess(node);
    
                        // Show loader
                        var statusId = node + 'StatusBar';
                        var statusBarLoaderId = node + 'StatusBarLoader';
                        $('#' + statusBarLoaderId).show();
                        $('#' + statusId).show();
                    }
                    
                    // Close dialog
                    $(this).dialog( "close" );
                } // End of else
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add zFCP device dialog
 * 
 * @param node Node to add disk to
 * @param hcp Hardware control point of node
 */
function openAddZfcpDialog(node, hcp) {
    // Get list of disk pools
    var cookie = $.cookie(hcp + 'zfcppools');
    var pools = cookie.split(',');
    
    // Create form to add disk
    var addZfcpForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a SCSI|FCP disk to this virtual server.');
    addZfcpForm.append(info);
    addZfcpForm.append('<div><label for="diskNode">Node:</label><input type="text" readonly="readonly" name="diskNode" value="' + node + '"/></div>');
    addZfcpForm.append('<div><label for="diskAddress">Disk address:</label><input type="text" name="diskAddress"/></div>');
    addZfcpForm.append('<div><label for="diskSize">Disk size:</label><input type="text" name="diskSize"/></div>');
    
    // Create drop down for disk pool
    var diskPool = $('<div></div>');
    diskPool.append('<label for="diskPool">Disk pool:</label>');
    var poolSelect = $('<select id="diskPool" name="diskPool"></select>');
    for ( var i = 0; i < pools.length; i++) {
        poolSelect.append('<option>' + pools[i] + '</option>');
    }
    diskPool.append(poolSelect);
    addZfcpForm.append(diskPool);

    // Tag to identify where device will be used
    addZfcpForm.append('<div><label for="diskTag">Disk tag:</label><input type="text" name="diskTag"/></div>');

    // Create advanced link to set advanced zFCP properties
    var advancedLnk = $('<div><label><a style="color: blue; cursor: pointer;">Advanced</a></label></div>');
    addZfcpForm.append(advancedLnk);    
    var advanced = $('<div style="margin-left: 20px;"></div>').hide();
    addZfcpForm.append(advanced);
    
    var portName = $('<div><label for="diskPortName">Port name:</label><input type="text" name="diskPortName"/></div>');
    var unitNo = $('<div><label for="diskUnitNo">Unit number:</label><input type="text" name="diskUnitNo"/></div>');
    advanced.append(portName, unitNo);
    
    // Toggle port name and unit number when clicking on advanced link
    advancedLnk.click(function() {
        advanced.toggle();
    });
    
    // Open dialog to add disk
    addZfcpForm.dialog({
        title:'Add zFCP device',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                // Get inputs
                var node = $(this).find('input[name=diskNode]').val();
                var address = $(this).find('input[name=diskAddress]').val();
                var size = $(this).find('input[name=diskSize]').val();
                var pool = $(this).find('select[name=diskPool]').val();
                var tag = $(this).find('select[name=diskTag]').val();
                var portName = $(this).find('select[name=diskPortName]').val();
                var unitNo = $(this).find('select[name=diskUnitNo]').val();
                
                // If inputs are not complete, show warning message
                if (!node || !address || !size || !pool) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    var args = '--addzfcp;' + pool + ';' + address + ';' + size;
                    if (tag && tag != "null") {
                        args += ';' + tag;
                    } if (portName && tag != "null") {
                        args += ';' + portName;
                    } if (unitNo && tag != "null") {
                        args += ';' + unitNo;
                    }
                    
                    // Add zFCP device
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : args,
                            msg : node
                        },

                        success : updateZNodeStatus
                    });

                    // Increment node process
                    incrementNodeProcess(node);

                    // Show loader
                    var statusId = node + 'StatusBar';
                    var statusBarLoaderId = node + 'StatusBarLoader';
                    $('#' + statusBarLoaderId).show();
                    $('#' + statusId).show();
                    
                    // Close dialog
                    $(this).dialog( "close" );
                } // End of else
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add NIC dialog
 * 
 * @param node Node to add NIC to
 * @param hcp Hardware control point of node
 */
function openAddNicDialog(node, hcp) {
    // Get network names
    var networks = $.cookie(hcp + 'networks').split(',');
        
    // Create form to add NIC
    var addNicForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a NIC to this virtual server.');
    addNicForm.append(info);
    addNicForm.append('<div><label for="nicNode">Node:</label><input type="text" readonly="readonly" id="nicNode" name="nicNode" value="' + node + '"/></div>');
    addNicForm.append('<div><label for="nicAddress">NIC address:</label><input type="text" id="nicAddress" name="nicAddress"/></div>');
    
    // Create drop down for NIC types
    var nicType = $('<div></div>');
    nicType.append('<label for="nicType">NIC type:</label>');
    var nicTypeSelect = $('<select id="nicType" name="nicType"></select>');
    nicTypeSelect.append('<option></option>'
        + '<option>QDIO</option>'
        + '<option>HiperSockets</option>'
    );
    nicType.append(nicTypeSelect);
    addNicForm.append(nicType);
        
    // Create drop down for network types
    var networkType = $('<div></div>');
    networkType.append('<label for="nicNetworkType">Network type:</label>');
    var networkTypeSelect = $('<select id="nicNetworkType" name="nicNetworkType"></select>');
    networkTypeSelect.append('<option></option>'
        + '<option>Guest LAN</option>'
        + '<option>Virtual Switch</option>'
    );
    networkType.append(networkTypeSelect);
    addNicForm.append(networkType);
            
    // Create drop down for network names
    var gLansQdioSelect = $('<select id="nicLanQdioName" name="nicLanQdioName"></select>');
    var gLansHipersSelect = $('<select id="nicLanHipersName" name="nicLanHipersName"></select>');
    var vswitchSelect = $('<select id="nicVSwitchName" name="nicVSwitchName"></select>');
    for ( var i = 0; i < networks.length; i++) {
        var network = networks[i].split(' ');
        var networkOption = $('<option>' + network[1] + ' ' + network[2] + '</option>');
        if (network[0] == 'VSWITCH') {
            vswitchSelect.append(networkOption);
        } else if (network[0] == 'LAN:QDIO') {
            gLansQdioSelect.append(networkOption);
        } else if (network[0] == 'LAN:HIPERS') {
            gLansHipersSelect.append(networkOption);
        }
    }
    
    // Hide network name drop downs until the NIC type and network type is selected
    // QDIO Guest LAN drop down
    var guestLanQdio = $('<div></div>').hide();
    guestLanQdio.append('<label for="nicLanQdioName">Guest LAN name:</label>');
    guestLanQdio.append(gLansQdioSelect);
    addNicForm.append(guestLanQdio);
    
    // HIPERS Guest LAN drop down
    var guestLanHipers = $('<div></div>').hide();
    guestLanHipers.append('<label for="nicLanHipersName">Guest LAN name:</label>');
    guestLanHipers.append(gLansHipersSelect);
    addNicForm.append(guestLanHipers);
    
    // VSWITCH drop down
    var vswitch = $('<div></div>').hide();
    vswitch.append('<label for="nicVSwitchName">VSWITCH name:</label>');
    vswitch.append(vswitchSelect);
    addNicForm.append(vswitch);
    
    // Show network names on change
    networkTypeSelect.change(function(){
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();
        
        // Get NIC type and network type
        var nicType = $(this).parent().parent().find('select[name=nicType]').val();
        var networkType = $(this).val();
                
        // Hide network name drop downs
        var guestLanQdio = $(this).parent().parent().find('select[name=nicLanQdioName]').parent();
        var guestLanHipers = $(this).parent().parent().find('select[name=nicLanHipersName]').parent();
        var vswitch = $(this).parent().parent().find('select[name=nicVSwitchName]').parent();
        guestLanQdio.hide();
        guestLanHipers.hide();
        vswitch.hide();
        
        // Show correct network name
        if (networkType == 'Guest LAN' && nicType == 'QDIO') {
            guestLanQdio.show();
        } else if (networkType == 'Guest LAN' && nicType == 'HiperSockets') {
            guestLanHipers.show();
        } else if (networkType == 'Virtual Switch') {
            if (nicType == 'QDIO') {
                vswitch.show();
            } else {
                // No such thing as HIPERS VSWITCH
                var warn = createWarnBar('The selected choices are not valid.');
                warn.prependTo($(this).parent().parent());
            }
        }
    });
    
    // Show network names on change
    nicTypeSelect.change(function(){
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();
        
        // Get NIC type and network type
        var nicType = $(this).val();
        var networkType = $(this).parent().parent().find('select[name=nicNetworkType]').val();

        // Hide network name drop downs
        var guestLanQdio = $(this).parent().parent().find('select[name=nicLanQdioName]').parent();
        var guestLanHipers = $(this).parent().parent().find('select[name=nicLanHipersName]').parent();
        var vswitch = $(this).parent().parent().find('select[name=nicVSwitchName]').parent();
        guestLanQdio.hide();
        guestLanHipers.hide();
        vswitch.hide();
        
        // Show correct network name
        if (networkType == 'Guest LAN' && nicType == 'QDIO') {
            guestLanQdio.show();
        } else if (networkType == 'Guest LAN' && nicType == 'HiperSockets') {
            guestLanHipers.show();
        } else if (networkType == 'Virtual Switch') {
            if (nicType == 'QDIO') {
                vswitch.show();
            } else {
                // No such thing as HIPERS VSWITCH
                var warn = createWarnBar('The selected choices are not valid.');
                warn.prependTo($(this).parent().parent());
            }
        }
    });
    
    // Open dialog to add NIC
    addNicForm.dialog({
        title:'Add NIC',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                var ready = true;
                var errMsg = '';
                
                // Get inputs
                var node = $(this).find('input[name=nicNode]').val();
                var nicType = $(this).find('select[name=nicType]').val();
                var networkType = $(this).find('select[name=nicNetworkType]').val();
                var address = $(this).find('input[name=nicAddress]').val();
                     
                // If inputs are not complete, show warning message
                if (!node || !nicType || !networkType || !address) {
                    errMsg = 'Please provide a value for each missing field.<br>';
                    ready = false;
                } 
                
                // If a HIPERS VSWITCH is selected, show warning message
                if (nicType == 'HiperSockets' && networkType == 'Virtual Switch') {
                    errMsg += 'The selected choices are not valid.'; 
                    ready = false;
                } 
                
                // If there are errors 
                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar(errMsg);
                    warn.prependTo($(this));
                } else {
                    // Add guest LAN
                    if (networkType == 'Guest LAN') {
                        var temp;
                        if (nicType == 'QDIO') {
                            temp = $(this).find('select[name=nicLanQdioName]').val().split(' ');
                        } else {
                            temp = $(this).find('select[name=nicLanHipersName]').val().split(' ');
                        }
                        
                        var lanOwner = temp[0];
                        var lanName = temp[1];
                        
                        $.ajax( {
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chvm',
                                tgt : node,
                                args : '--addnic;' + address + ';' + nicType + ';3',
                                msg : 'node=' + node + ';addr=' + address + ';lan='
                                    + lanName + ';owner=' + lanOwner
                            },
                            success : connect2GuestLan
                        });
                    }
            
                    // Add virtual switch
                    else if (networkType == 'Virtual Switch' && nicType == 'QDIO') {
                        var temp = $(this).find('select[name=nicVSwitchName]').val().split(' ');
                        var vswitchName = temp[1];
            
                        $.ajax( {
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chvm',
                                tgt : node,
                                args : '--addnic;' + address + ';' + nicType + ';3',
                                msg : 'node=' + node + ';addr=' + address + ';vsw='
                                    + vswitchName
                            },
            
                            success : connect2VSwitch
                        });
                    } 
                                                    
                    // Increment node process
                    incrementNodeProcess(node);
            
                    // Show loader
                    $('#' + node + 'StatusBarLoader').show();
                    $('#' + node + 'StatusBar').show();
            
                    // Close dialog
                    $(this).dialog( "close" );
                } // End of else
            },
            "Cancel": function(){
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Remove processor
 * 
 * @param node Node where processor is attached
 * @param address Virtual address of processor
 */
function removeProcessor(node, address) {
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--removeprocessor;' + address,
            msg : node
        },

        success : updateZNodeStatus
    });

    // Increment node process
    incrementNodeProcess(node);

    // Show loader
    $('#' + node + 'StatusBarLoader').show();
    $('#' + node + 'StatusBar').show();
}

/**
 * Remove disk
 * 
 * @param node Node where disk is attached
 * @param address Virtual address of disk
 */
function removeDisk(node, address) {
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--removedisk;' + address,
            msg : node
        },

        success : updateZNodeStatus
    });

    // Increment node process
    incrementNodeProcess(node);

    // Show loader
    $('#' + node + 'StatusBarLoader').show();
    $('#' + node + 'StatusBar').show();
}

/**
 * Remove zFCP device
 * 
 * @param node Node where disk is attached
 * @param address Virtual address of zFCP device
 * @param wwpn World wide port name of zFCP device
 * @param lun Logical unit number of zFCP device
 */
function removeZfcp(node, address, wwpn, lun) {
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--removezfcp;' + address + ';' + wwpn + ';' + lun,
            msg : node
        },

        success : updateZNodeStatus
    });

    // Increment node process
    incrementNodeProcess(node);

    // Show loader
    $('#' + node + 'StatusBarLoader').show();
    $('#' + node + 'StatusBar').show();
}

/**
 * Remove NIC
 * 
 * @param node Node where NIC is attached
 * @param address Virtual address of NIC
 */
function removeNic(node, nic) {
    var args = nic.split('.');
    var address = args[0];

    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--removenic;' + address,
            msg : node
        },

        success : updateZNodeStatus
    });

    // Increment node process
    incrementNodeProcess(node);

    // Show loader
    $('#' + node + 'StatusBarLoader').show();
    $('#' + node + 'StatusBar').show();
}

/**
 * Set a cookie for the network names of a given node
 * 
 * @param data Data from HTTP request
 */
function setNetworkCookies(data) {
    if (data.rsp) {
        var node = data.msg;
        var networks = data.rsp[0].split(node + ': ');
        
        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
        $.cookie(node + 'networks', networks, { expires: exDate });
    }
}

/**
 * Get contents of each disk pool
 * 
 * @param data HTTP request data
 */
function getDiskPool(data) {
    if (data.rsp) {
        var hcp = data.msg;
        var pools = data.rsp[0].split(hcp + ': ');

        // Get contents of each disk pool
        for ( var i in pools) {
            if (pools[i]) {
                pools[i] = jQuery.trim(pools[i]);
                      
                // Get used space
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--diskpool;' + pools[i] + ';used',
                        msg : 'hcp=' + hcp + ';pool=' + pools[i] + ';stat=used'
                    },

                    success : loadDiskPoolTable
                });

                // Get free space
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--diskpool;' + pools[i] + ';free',
                        msg : 'hcp=' + hcp + ';pool=' + pools[i] + ';stat=free'
                    },

                    success : loadDiskPoolTable
                });
            } // End of if
        } // End of for
    }
}

/**
 * Get contents of each zFCP pool
 * 
 * @param data HTTP request data
 */
function getZfcpPool(data) {
    if (data.rsp) {
        var hcp = data.msg;
        var pools = data.rsp[0].split(hcp + ': ');

        // Get contents of each disk pool
        for ( var i in pools) {
            if (pools[i]) {
                pools[i] = jQuery.trim(pools[i]);
                      
                // Query used and free space
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--zfcppool;' + pools[i] + ';all',
                        msg : 'hcp=' + hcp + ';pool=' + pools[i]
                    },

                    success : loadZfcpPoolTable
                });
            } // End of if
        } // End of for
    }
}

/**
 * Get details of each network
 * 
 * @param data HTTP request data
 */
function getNetwork(data) {
    if (data.rsp) {
        var hcp = data.msg;
        var networks = data.rsp[0].split(hcp + ': ');

        // Loop through each network
        for ( var i = 1; i < networks.length; i++) {
            var args = networks[i].split(' ');
            var type = args[0];
            var name = args[2];

            // Get network details
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'lsvm',
                    tgt : hcp,
                    args : '--getnetwork;' + name,
                    msg : 'hcp=' + hcp + ';type=' + type + ';network=' + name
                },

                success : loadNetworkTable
            });
        } // End of for
    } // End of if
}

/**
 * Load disk pool contents into a table
 * 
 * @param data HTTP request data
 */
function loadDiskPoolTable(data) {
    // Remove loader
    var panelId = 'zvmDiskResource';
    $('#' + panelId).find('img[src="images/loader.gif"]').remove();
    
    var args = data.msg.split(';');
    var hcp = args[0].replace('hcp=', '');
    var pool = args[1].replace('pool=', '');
    var stat = args[2].replace('stat=', '');
    var tmp = data.rsp[0].split(hcp + ': ');

    // Resource tab ID    
    var info = $('#' + panelId).find('.ui-state-highlight');
    // If there is no info bar
    if (!info.length) {
        // Create info bar
        info = createInfoBar('Below are disks that are defined in the EXTENT CONTROL file.');
        $('#' + panelId).append(info);
    }

    // Get datatable
    var tableId = 'zDiskDataTable';
    var dTable = getDiskDataTable();
    if (!dTable) {
        // Create a datatable        
        var table = new DataTable(tableId);
        // Resource headers: volume ID, device type, start address, and size
        table.init( [ '<input type="checkbox" onclick="selectAllDisk(event, $(this))">', 'zHCP', 'Pool', 'Status', 'Region', 'Device type', 'Starting address', 'Size' ]);

        // Append datatable to panel
        $('#' + panelId).append(table.object());

        // Turn into datatable
        dTable = $('#' + tableId).dataTable();
        setDiskDataTable(dTable);
    }

    // Skip index 0 and 1 because it contains nothing
    for ( var i = 2; i < tmp.length; i++) {
        tmp[i] = jQuery.trim(tmp[i]);
        var diskAttrs = tmp[i].split(' ');
        dTable.fnAddData( [ '<input type="checkbox" name="' + diskAttrs[0] + '"/>', hcp, pool, stat, diskAttrs[0], diskAttrs[1], diskAttrs[2], diskAttrs[3] ]);
    }
    
    // Create actions menu
    if (!$('#zvmResourceActions').length) {
        // Empty filter area
        $('#' + tableId + '_length').empty();
        
        // Add disk to pool
        var addLnk = $('<a>Add</a>');
        addLnk.bind('click', function(event){
            openAddDisk2PoolDialog();
        });
        
        // Delete disk from pool
        var removeLnk = $('<a>Remove</a>');
        removeLnk.bind('click', function(event){
            var disks = getNodesChecked(tableId);
            openRemoveDiskFromPoolDialog(disks);
        });
        
        // Refresh table
        var refreshLnk = $('<a>Refresh</a>');
        refreshLnk.bind('click', function(event){
            $('#zvmDiskResource').empty().append(createLoader(''));
            setDiskDataTable('');
            
            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1)
                hcps = $.cookie('hcp').split(',');
            else
                hcps.push($.cookie('hcp'));
            
            // Query the disk pools for each
            for (var i in hcps) {
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--diskpoolnames',
                        msg : hcps[i]
                    },

                    success : getDiskPool
                });
            }    
        });
        
        // Create action bar
        var actionBar = $('<div id="zvmResourceActions" class="actionBar"></div>');
        
        // Create an action menu
        var actionsMenu = createMenu([addLnk, removeLnk, refreshLnk]);
        actionsMenu.superfish();
        actionsMenu.css('display', 'inline-block');
        actionBar.append(actionsMenu);
        
        // Set correct theme for action menu
        actionsMenu.find('li').hover(function() {
            setMenu2Theme($(this));
        }, function() {
            setMenu2Normal($(this));
        });
        
        // Create a division to hold actions menu
        var menuDiv = $('<div id="' + tableId + '_menuDiv" class="menuDiv"></div>');
        $('#' + tableId + '_length').prepend(menuDiv);
        $('#' + tableId + '_length').css({
            'padding': '0px',
            'width': '500px'
        });
        $('#' + tableId + '_filter').css('padding', '10px');
        menuDiv.append(actionBar);
    }
    
    // Resize accordion
    $('#zvmResourceAccordion').accordion('resize');
}

/**
 * Load zFCP pool contents into a table
 * 
 * @param data HTTP request data
 */
function loadZfcpPoolTable(data) {
    // Delete loader
    var panelId = 'zfcpResource';
    $('#' + panelId).find('img[src="images/loader.gif"]').remove();
    
    var args = data.msg.split(';');
    var hcp = args[0].replace('hcp=', '');
    var pool = args[1].replace('pool=', '');
    var tmp = data.rsp[0].split(hcp + ': ');

    // Resource tab ID    
    var info = $('#' + panelId).find('.ui-state-highlight');
    // If there is no info bar, create info bar
    if (!info.length) {
        info = createInfoBar('Below are devices that are defined internally in the zFCP pools.');
        $('#' + panelId).append(info);
    }

    // Get datatable
    var tableId = 'zFcpDataTable';
    var dTable = getZfcpDataTable();
    if (!dTable) {
        // Create a datatable        
        var table = new DataTable(tableId);
        // Resource headers: status, WWPN, LUN, size, owner, channel, tag
        table.init( [ '<input type="checkbox" onclick="selectAllDisk(event, $(this))">', 'zHCP', 'Pool', 'Status', 'Port name', 'Unit number', 'Size', 'Owner', 'Channel', 'Tag' ]);

        // Append datatable to panel
        $('#' + panelId).append(table.object());

        // Turn into datatable
        dTable = $('#' + tableId).dataTable({
            "sScrollX": "100%",
            "bAutoWidth": true
        });
        setZfcpDataTable(dTable);
    }

    // Skip index 0 and 1 because it contains nothing
    for ( var i = 2; i < tmp.length; i++) {
        tmp[i] = jQuery.trim(tmp[i]);
        var diskAttrs = tmp[i].split(',');
        dTable.fnAddData( [ '<input type="checkbox" name="' + pool + '-' + diskAttrs[2] + '"/>', hcp, pool, diskAttrs[0], diskAttrs[1], diskAttrs[2], diskAttrs[3], diskAttrs[4], diskAttrs[5], diskAttrs[6] ]);
    }
    
    // Create actions menu
    if (!$('#zFcpResourceActions').length) {
        // Empty filter area
        $('#' + tableId + '_length').empty();
        
        // Add disk to pool
        var addLnk = $('<a>Add</a>');
        addLnk.bind('click', function(event){
            openAddZfcp2PoolDialog();
        });
        
        // Delete disk from pool
        var removeLnk = $('<a>Remove</a>');
        removeLnk.bind('click', function(event){
            var disks = getNodesChecked(tableId);
            openRemoveZfcpFromPoolDialog(disks);
        });
        
        // Refresh table
        var refreshLnk = $('<a>Refresh</a>');
        refreshLnk.bind('click', function(event){
            $('#zfcpResource').empty().append(createLoader(''));
            setZfcpDataTable('');
            
            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1)
                hcps = $.cookie('hcp').split(',');
            else
                hcps.push($.cookie('hcp'));
            
            // Query the disk pools for each
            for (var i in hcps) {
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--zfcppoolnames',
                        msg : hcps[i]
                    },

                    success : getZfcpPool
                });
            }    
        });
        
        // Create action bar
        var actionBar = $('<div id="zFcpResourceActions" class="actionBar"></div>');
        
        // Create an action menu
        var actionsMenu = createMenu([addLnk, removeLnk, refreshLnk]);
        actionsMenu.superfish();
        actionsMenu.css('display', 'inline-block');
        actionBar.append(actionsMenu);
        
        // Set correct theme for action menu
        actionsMenu.find('li').hover(function() {
            setMenu2Theme($(this));
        }, function() {
            setMenu2Normal($(this));
        });
        
        // Create a division to hold actions menu
        var menuDiv = $('<div id="' + tableId + '_menuDiv" class="menuDiv"></div>');
        $('#' + tableId + '_length').prepend(menuDiv);
        $('#' + tableId + '_length').css({
            'padding': '0px',
            'width': '500px'
        });
        $('#' + tableId + '_filter').css('padding', '10px');
        menuDiv.append(actionBar);
    }
    
    // Resize accordion
    $('#zvmResourceAccordion').accordion('resize');
}

/**
 * Open dialog to remove disk from pool
 * 
 * @param disks2remove Disks selected in table
 */
function openRemoveDiskFromPoolDialog(disks2remove) {
    // Create form to delete disk from pool
    var dialogId = 'zvmDeleteDiskFromPool';
    var deleteDiskForm = $('<div id="' + dialogId + '" class="form"></div>');
    
    // Create info bar
    var info = createInfoBar('Remove a disk from a disk pool defined in the EXTENT CONTROL.');
    deleteDiskForm.append(info);
    var action = $('<div><label>Action:</label></div>');
    var actionSelect = $('<select name="action">'
            + '<option value=""></option>'
            + '<option value="1">Remove region</option>'
            + '<option value="2">Remove region from group</option>'
            + '<option value="3">Remove region from all groups</option>'
            + '<option value="7">Remove entire group</option>'
        + '</select>');
    action.append(actionSelect);
    
    var hcp = $('<div><label>Hardware control point:</label></div>');
    var hcpSelect = $('<select name="hcp"></select>');
    hcp.append(hcpSelect);
    
    // Set region input based on those selected on table (if any)
    var region = $('<div><label>Region name:</label><input type="text" name="region" value="' + disks2remove + '"/></div>');
    var group = $('<div><label>Group name:</label><input type="text" name="group"/></div>');
    deleteDiskForm.append(action, hcp, region, group);

    // Create a array for hardware control points
    var hcps = new Array();
    if ($.cookie('hcp').indexOf(',') > -1)
        hcps = $.cookie('hcp').split(',');
    else
        hcps.push($.cookie('hcp'));
    
    // Append options for hardware control points
    for (var i in hcps) {
        hcpSelect.append($('<option value="' + hcps[i] + '">' + hcps[i] + '</option>'));
    }
            
    actionSelect.change(function() {
        if ($(this).val() == '1' || $(this).val() == '3') {
            region.show();
            group.hide();
        } else if ($(this).val() == '2') {
            region.show();
            group.show();
        } else if ($(this).val() == '7') {
            region.val('FOOBAR');
            region.hide();
            group.show();
        }        
    });
        
    // Open dialog to delete disk
    deleteDiskForm.dialog({
        title:'Delete disk from pool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                // Get inputs
                var action = $(this).find('select[name=action]').val();
                var hcp = $(this).find('select[name=hcp]').val();
                var region = $(this).find('input[name=region]').val();
                var group = $(this).find('input[name=group]').val();
                                
                // If inputs are not complete, show warning message
                if (!action || !hcp) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Change dialog buttons
                    $(this).dialog('option', 'buttons', {
                        'Close': function() {$(this).dialog("close");}
                    });
                    
                    var args;
                    if (action == '2' || action == '7')
                        args = region + ';' + group;
                    else
                        args = group;
                    
                    // Remove disk from pool
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : hcp,
                            args : '--removediskfrompool;' + action + ';' + args,
                            msg : dialogId
                        },
    
                        success : updateResourceDialog
                    });
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to add disk to pool
 */
function openAddDisk2PoolDialog() {
    // Create form to add disk to pool
    var dialogId = 'zvmAddDisk2Pool';
    var addDiskForm = $('<div id="' + dialogId + '" class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a disk to a disk pool defined in the EXTENT CONTROL. The disk has to already be attached to SYSTEM.');
    addDiskForm.append(info);
    var action = $('<div><label>Action:</label></div>');
    var actionSelect = $('<select name="action">'
            + '<option value=""></option>'
            + '<option value="4">Define region and add to group</option>'
            + '<option value="5">Add existing region to group</option>'
        + '</select>');
    action.append(actionSelect);
    
    var hcp = $('<div><label>Hardware control point:</label></div>');
    var hcpSelect = $('<select name="hcp"></select>');
    hcp.append(hcpSelect);
    var region = $('<div><label>Region name:</label><input type="text" name="region"/></div>');
    var volume = $('<div><label>Volume name:</label><input type="text" name="volume"/></div>');
    var group = $('<div><label>Group name:</label><input type="text" name="group"/></div>');
    addDiskForm.append(action, hcp, region, volume, group);

    // Create a array for hardware control points
    var hcps = new Array();
    if ($.cookie('hcp').indexOf(',') > -1)
        hcps = $.cookie('hcp').split(',');
    else
        hcps.push($.cookie('hcp'));
    
    // Append options for hardware control points
    for (var i in hcps) {
        hcpSelect.append($('<option value="' + hcps[i] + '">' + hcps[i] + '</option>'));
    }
            
    actionSelect.change(function() {
        if ($(this).val() == '4') {
            volume.show();
        } else if ($(this).val() == '5') {
            volume.hide();
        }            
    });
        
    // Open dialog to add disk
    addDiskForm.dialog({
        title:'Add disk to pool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                // Get inputs
                var action = $(this).find('select[name=action]').val();
                var hcp = $(this).find('select[name=hcp]').val();
                var region = $(this).find('input[name=region]').val();
                var volume = $(this).find('input[name=volume]').val();
                var group = $(this).find('input[name=group]').val();
                                
                // If inputs are not complete, show warning message
                if (!action || !hcp || !region || !group) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Change dialog buttons
                    $(this).dialog('option', 'buttons', {
                        'Close': function() {$(this).dialog("close");}
                    });
                    
                    var args;
                    if (action == '4')
                        args = region + ';' + volume + ';' + group;
                    else
                        args = region + ';' + group;
                    
                    // Add disk to pool
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : hcp,
                            args : '--adddisk2pool;' + action + ';' + args,
                            msg : dialogId
                        },
    
                        success : updateResourceDialog
                    });
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to remove zFCP from pool
 * 
 * @param devices2remove Comman separated devices selected in table
 */
function openRemoveZfcpFromPoolDialog(devices2remove) {
    // Create form to delete device from pool
    var dialogId = 'zvmDeleteZfcpFromPool';
    var deleteDiskForm = $('<div id="' + dialogId + '" class="form"></div>');
    
    // Verify disks are in the same zFCP pool
    var devices = devices2remove.split(',');
    var tmp, tgtPool;
    var tgtUnitNo = "";
    for (var i in devices) {
    	tmp = devices[i].split('-');
    	
    	if (tgtPool && tmp[0] != tgtPool) {
    		openDialog("warn", "Please select devices in the same zFCP");
            return;
    	} else {
    		tgtPool = tmp[0];
    	}
    	
        tgtUnitNo += tmp[1] + ",";
    }
    
    // Strip out last comma
    tgtUnitNo = tgtUnitNo.slice(0, -1);
    
    // Create info bar
    var info = createInfoBar('Remove a zFCP device that is defined in a zFCP pool.');
    deleteDiskForm.append(info);
        
    var hcp = $('<div><label>Hardware control point:</label></div>');
    var hcpSelect = $('<select name="hcp"></select>');
    hcp.append(hcpSelect);
    
    var pool = $('<div><label>zFCP pool:</label><input type="text" name="zfcpPool" value="' + tgtPool + '"/></div>');
    var unitNo = $('<div><label>Unit number:</label><input type="text" name="unitNo" value="' + tgtUnitNo + '"/></div>');
    deleteDiskForm.append(hcp, pool, unitNo);

    // Create a array for hardware control points
    var hcps = new Array();
    if ($.cookie('hcp').indexOf(',') > -1) {
        hcps = $.cookie('hcp').split(',');
    } else {
        hcps.push($.cookie('hcp'));
    }
    
    // Append options for hardware control points
    for (var i in hcps) {
        hcpSelect.append($('<option value="' + hcps[i] + '">' + hcps[i] + '</option>'));
    }

    // Open dialog to delete device
    deleteDiskForm.dialog({
        title:'Delete device from pool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                var hcp = $(this).find('select[name=hcp]').val();
                var pool = $(this).find('input[name=zfcpPool]').val();
                var unitNo = $(this).find('input[name=unitNo]').val();
                                
                // If inputs are not complete, show warning message
                if (!hcp || !pool || !unitNo) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Change dialog buttons
                    $(this).dialog('option', 'buttons', {
                        'Close': function() {$(this).dialog("close");}
                    });
                    
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : hcp,
                            args : '--removezfcpfrompool;' + pool + ';' + unitNo,
                            msg : dialogId
                        },
    
                        success : updateResourceDialog
                    });
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to add zFCP to pool
 */
function openAddZfcp2PoolDialog() {
    // Create form to add disk to pool
    var dialogId = 'zvmAddDisk2Pool';
    var addDiskForm = $('<div id="' + dialogId + '" class="form"></div>');
    var info = createInfoBar('Add a device to a zFCP pool defined in xCAT.');
    addDiskForm.append(info);
    
    var hcp = $('<div><label>Hardware control point:</label></div>');
    var hcpSelect = $('<select name="hcp"></select>');
    hcp.append(hcpSelect);
    
    var pool = $('<div><label>zFCP pool:</label><input type="text" name="zfcpPool"/></div>');
    var status = $('<div><label>Status:</label><select name="zfcpStatus">'
    		+ '<option value="free">free</option>'
    		+ '<option value="used">used</option>'
        + '</select></div>');
    var portName = $('<div><label>Port name:</label><input type="text" name="zfcpPortName"/></div>');
    var unitNo = $('<div><label>Unit number:</label><input type="text" name="zfcpUnitNo"/></div>');
    var size = $('<div><label>Size:</label><input type="text" name="zfcpSize"/></div>');
    var owner = $('<div><label>Owner:</label><input type="text" name="zfcpOwner"/></div>');
    addDiskForm.append(hcp, pool, status, portName, unitNo, size, owner);

    // Create a array for hardware control points
    var hcps = new Array();
    if ($.cookie('hcp').indexOf(',') > -1) {
        hcps = $.cookie('hcp').split(',');
    } else {
        hcps.push($.cookie('hcp'));
    }
    
    for (var i in hcps) {
        hcpSelect.append($('<option value="' + hcps[i] + '">' + hcps[i] + '</option>'));
    }
        
    // Open dialog to add disk
    addDiskForm.dialog({
        title:'Add device to pool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Delete any warning messages
                $(this).find('.ui-state-error').remove();
                
                var tgtHcp = $(this).find('select[name=hcp]').val();
                var tgtPool = $(this).find('input[name=zfcpPool]').val();
                var tgtStatus = $(this).find('select[name=zfcpStatus]').val();
                var tgtPortName = $(this).find('input[name=zfcpPortName]').val();
                var tgtUnitNo = $(this).find('input[name=zfcpUnitNo]').val();
                var tgtSize = $(this).find('input[name=zfcpSize]').val();
                
                // Device owner is optional
                var tgtOwner = "";
                if ($(this).find('input[name=zfcpOwner]').val()) {
                	tgtOwner = $(this).find('input[name=zfcpOwner]').val();
                }                
                                
                // If inputs are not complete, show warning message
                if (!tgtHcp || !tgtPool || !tgtStatus || !tgtPortName || !tgtUnitNo || !tgtSize) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Change dialog buttons
                    $(this).dialog('option', 'buttons', {
                        'Close': function() {$(this).dialog("close");}
                    });
                    
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : tgtHcp,
                            args : '--addzfcp2pool;' + tgtPool + ';' + tgtStatus + ';' + tgtPortName + ';' + tgtUnitNo + ';' + tgtSize + ';' + tgtOwner,
                            msg : dialogId
                        },
    
                        success : updateResourceDialog
                    });
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Update resource dialog
 * 
 * @param data HTTP request data
 */
function updateResourceDialog(data) {    
    var dialogId = data.msg;
    var infoMsg;

    // Create info message
    if (jQuery.isArray(data.rsp)) {
        infoMsg = '';
        for (var i in data.rsp) {
            infoMsg += data.rsp[i] + '</br>';
        }
    } else {
        infoMsg = data.rsp;
    }
    
    // Create info bar with close button
    var infoBar = $('<div class="ui-state-highlight ui-corner-all"></div>').css('margin', '5px 0px');
    var icon = $('<span class="ui-icon ui-icon-info"></span>').css({
        'display': 'inline-block',
        'margin': '10px 5px'
    });
    
    // Create close button to close info bar
    var close = $('<span class="ui-icon ui-icon-close"></span>').css({
        'display': 'inline-block',
        'float': 'right'
    }).click(function() {
        $(this).parent().remove();
    });
    
    var msg = $('<pre>' + infoMsg + '</pre>').css({
        'display': 'inline-block',
        'width': '90%'
    });
    
    infoBar.append(icon, msg, close);    
    infoBar.prependTo($('#' + dialogId));
}

/**
 * Select all checkboxes in the datatable
 * 
 * @param event Event on element
 * @param obj Object triggering event
 */
function selectAllDisk(event, obj) {
    // This will ascend from <input> <th> <tr> <thead> <table>
    var tableObj = obj.parents('.datatable');
    var status = obj.attr('checked');
    tableObj.find(' :checkbox').attr('checked', status);

    // Handle datatable scroll
    tableObj = obj.parents('.dataTables_scroll');
    if (tableObj.length) {
    	tableObj.find(' :checkbox').attr('checked', status);
    }
    
    event.stopPropagation();
}

/**
 * Load network details into a table
 * 
 * @param data HTTP request data
 */
function loadNetworkTable(data) {
    // Remove loader
    var panelId = 'zvmNetworkResource';
    $('#' + panelId).find('img[src="images/loader.gif"]').remove();
    
    var args = data.msg.split(';');
    var hcp = args[0].replace('hcp=', '');
    var type = args[1].replace('type=', '');
    var name = args[2].replace('network=', '');
    var tmp = data.rsp[0].split(hcp + ': ');

    // Resource tab ID    
    var info = $('#' + panelId).find('.ui-state-highlight');
    // If there is no info bar
    if (!info.length) {
        // Create info bar
        info = createInfoBar('Below are LANs/VSWITCHes available to use.');
        $('#' + panelId).append(info);
    }

    // Get datatable
    var dTable = getNetworkDataTable();
    if (!dTable) {
        // Create table
        var tableId = 'zNetworkDataTable';
        var table = new DataTable(tableId);
        table.init( [ 'HCP', 'Type', 'Name', 'Details' ]);

        // Append datatable to tab
        $('#' + panelId).append(table.object());

        // Turn into datatable
        dTable = $('#' + tableId).dataTable();
        setNetworkDataTable(dTable);

        // Set the column width
        var cols = table.object().find('thead tr th');
        cols.eq(0).css('width', '20px'); // HCP column
        cols.eq(1).css('width', '20px'); // Type column
        cols.eq(2).css('width', '20px'); // Name column
        cols.eq(3).css({'width': '600px'}); // Details column
    }

    // Skip index 0 because it contains nothing
    var details = '<pre style="text-align: left;">';
    for ( var i = 1; i < tmp.length; i++) {
        details += tmp[i];
    }
    details += '</pre>';
    
    dTable.fnAddData([ '<pre>' + hcp + '</pre>', '<pre>' + type + '</pre>', '<pre>' + name + '</pre>', details ]);
    
    // Resize accordion
    $('#zvmResourceAccordion').accordion('resize');
}

/**
 * Connect a NIC to a Guest LAN
 * 
 * @param data Data from HTTP request
 */
function connect2GuestLan(data) {
    var rsp = data.rsp;
    var args = data.msg.split(';');
    var node = args[0].replace('node=', '');
    var address = args[1].replace('addr=', '');
    var lanName = args[2].replace('lan=', '');
    var lanOwner = args[3].replace('owner=', '');
    
    // Write ajax response to status bar
    var prg = writeRsp(rsp, node + ': ');
    $('#' + node + 'StatusBar').find('div').append(prg);
            
    // Connect NIC to Guest LAN
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--connectnic2guestlan;' + address + ';' + lanName + ';'
                + lanOwner,
            msg : node
        },

        success : updateZNodeStatus
    });
}

/**
 * Connect a NIC to a VSwitch
 * 
 * @param data Data from HTTP request
 */
function connect2VSwitch(data) {
    var rsp = data.rsp;
    var args = data.msg.split(';');
    var node = args[0].replace('node=', '');
    var address = args[1].replace('addr=', '');
    var vswitchName = args[2].replace('vsw=', '');
    
    // Write ajax response to status bar
    var prg = writeRsp(rsp, node + ': ');
    $('#' + node + 'StatusBar').find('div').append(prg);

    // Connect NIC to VSwitch
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--connectnic2vswitch;' + address + ';' + vswitchName,
            msg : node
        },

        success : updateZNodeStatus
    });
}

/**
 * Create provision existing node division
 * 
 * @param inst Provision tab instance
 * @return Provision existing node division
 */
function createZProvisionExisting(inst) {
    // Create provision existing and hide it
    var provExisting = $('<div></div>').hide();
    
    var vmFS = $('<fieldset></fieldset>');
    var vmLegend = $('<legend>Virtual Machine</legend>');
    vmFS.append(vmLegend);
    provExisting.append(vmFS);
        
    var vmAttr = $('<div style="display: inline-table; vertical-align: middle; width: 85%; margin-left: 10px;"></div>');
    vmFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/computer.png"></img></div>'));
    vmFS.append(vmAttr);
        
    var osFS = $('<fieldset></fieldset>');
    var osLegend = $('<legend>Operating System</legend>');
    osFS.append(osLegend);
    provExisting.append(osFS);
    
    var osAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    osFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/operating_system.png"></img></div>'));
    osFS.append(osAttr);
        
    // Create group input
    var group = $('<div></div>');
    var groupLabel = $('<label for="provType">Group:</label>');
    group.append(groupLabel);
    
    // Turn on auto complete for group
    var groupNames = $.cookie('groups');
    if (groupNames) {
        // Split group names into an array
        var tmp = groupNames.split(',');
        
        // Create drop down for groups        
        var groupSelect = $('<select></select>');
        groupSelect.append('<option></option>');
        for (var i in tmp) {
            // Add group into drop down
            var opt = $('<option value="' + tmp[i] + '">' + tmp[i] + '</option>');
            groupSelect.append(opt);
        }
        group.append(groupSelect);
        
        // Create node datatable
        groupSelect.change(function(){            
            // Get group selected
            var thisGroup = $(this).val();
            // If a valid group is selected
            if (thisGroup) {
                createNodesDatatable(thisGroup, 'zNodesDatatableDIV' + inst);
            }
        });
    } else {
        // If no groups are cookied
        var groupInput = $('<input type="text" name="group"/>');
        group.append(groupInput);
    }
    vmAttr.append(group);

    // Create node input
    var node = $('<div></div>');
    var nodeLabel = $('<label for="nodeName">Nodes:</label>');
    var nodeDatatable = $('<div class="indent" id="zNodesDatatableDIV' + inst + '" style="display: inline-block; max-width: 800px;"><p>Select a group to view its nodes</p></div>');
    node.append(nodeLabel);
    node.append(nodeDatatable);
    vmAttr.append(node);
    
    // Create operating system image input
    var os = $('<div></div>');
    var osLabel = $('<label for="os">Operating system image:</label>');
    var osInput = $('<input type="text" name="os" title="You must give the operating system to install on this node or node range, e.g. rhel5.5-s390x-install-compute"/>');
    // Get image names on focus
    osInput.one('focus', function(){
        var imageNames = $.cookie('imagenames');
        if (imageNames) {
            // Turn on auto complete
            $(this).autocomplete({
                source: imageNames.split(',')
            });
        }
    });
    os.append(osLabel);
    os.append(osInput);
    osAttr.append(os);
    
    // Create boot method drop down
    var bootMethod = $('<div></div>');
    var methoddLabel = $('<label>Boot method:</label>');
    var methodSelect = $('<select name="bootMethod"></select>');
    methodSelect.append('<option value="boot">boot</option>'
        + '<option value="install">install</option>'
        + '<option value="iscsiboot">iscsiboot</option>'
        + '<option value="netboot">netboot</option>'
        + '<option value="statelite">statelite</option>'
    );
    bootMethod.append(methoddLabel);
    bootMethod.append(methodSelect);
    osAttr.append(bootMethod);
    
    // Generate tooltips
    provExisting.find('div input[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",        
        opacity: 0.7,
        predelay: 800,
        events: {
            def:     "mouseover,mouseout",
            input:   "mouseover,mouseout",
            widget:  "focus mouseover,blur mouseout",
            tooltip: "mouseover,mouseout"
        }
    });
    
    /**
     * Provision existing
     */
    var provisionBtn = createButton('Provision');
    provisionBtn.bind('click', function(event) {
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();
        
        var ready = true;
        var errMsg = '';

        // Get provision tab ID
        var thisTabId = $(this).parent().parent().parent().attr('id');
        // Get provision tab instance
        var inst = thisTabId.replace('zvmProvisionTab', '');
        
        // Get nodes that were checked
        var dTableId = 'zNodesDatatable' + inst;
        var tgts = getNodesChecked(dTableId);
        if (!tgts) {
            errMsg += 'You need to select a node.<br>';
            ready = false;
        }
        
        // Check operating system image
        var os = $('#' + thisTabId + ' input[name=os]:visible');
        if (!os.val()) {
            errMsg += 'You need to select a operating system image.';
            os.css('border', 'solid #FF0000 1px');
            ready = false;
        } else {
            os.css('border', 'solid #BDBDBD 1px');
        }
        
        // If all inputs are valid, ready to provision
        if (ready) {            
            // Disable provision button
            $(this).attr('disabled', 'true');
            
            // Show loader
            $('#zProvisionStatBar' + inst).show();
            $('#zProvisionLoader' + inst).show();

            // Disable all inputs
            var inputs = $('#' + thisTabId + ' input:visible');
            inputs.attr('disabled', 'disabled');
                        
            // Disable all selects
            var selects = $('#' + thisTabId + ' select');
            selects.attr('disabled', 'disabled');
                        
            // Get operating system image
            var osImage = $('#' + thisTabId + ' input[name=os]:visible').val();
            var tmp = osImage.split('-');
            var os = tmp[0];
            var arch = tmp[1];
            var profile = tmp[3];
                                    
            /**
             * (1) Set operating system
             */
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'nodeadd',
                    tgt : '',
                    args : tgts + ';noderes.netboot=zvm;nodetype.os=' + os + ';nodetype.arch=' + arch + ';nodetype.profile=' + profile,
                    msg : 'cmd=nodeadd;out=' + inst
                },

                success : updateZProvisionExistingStatus
            });
        } else {
            // Show warning message
            var warn = createWarnBar(errMsg);
            warn.prependTo($(this).parent().parent());
        }
    });
    provExisting.append(provisionBtn);
    
    return provExisting;
}

/**
 * Create provision new node division
 * 
 * @param inst Provision tab instance
 * @return Provision new node division
 */
function createZProvisionNew(inst) {
    // Create provision new node division
    var provNew = $('<div></div>');
    
    // Create VM fieldset
    var vmFS = $('<fieldset></fieldset>');
    var vmLegend = $('<legend>Virtual Machine</legend>');
    vmFS.append(vmLegend);
    provNew.append(vmFS);
    
    var vmAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    vmFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/computer.png"></img></div>'));
    vmFS.append(vmAttr);
    
    // Create OS fieldset
    var osFS = $('<fieldset></fieldset>');
    var osLegend = $('<legend>Operating System</legend>');
    osFS.append(osLegend);
    provNew.append(osFS);
    
    // Create hardware fieldset
    var hwFS = $('<fieldset></fieldset>');
    var hwLegend = $('<legend>Hardware</legend>');
    hwFS.append(hwLegend);
    provNew.append(hwFS);
    
    var hwAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    hwFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/hardware.png"></img></div>'));
    hwFS.append(hwAttr);
        
    var osAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    osFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/operating_system.png"></img></div>'));
    osFS.append(osAttr);
    
    // Create group input
    var group = $('<div></div>');
    var groupLabel = $('<label>Group:</label>');
    var groupInput = $('<input type="text" name="group" title="You must give the group name that the node(s) will be placed under"/>');
    // Get groups on-focus
    groupInput.one('focus', function(){
        var groupNames = $.cookie('groups');
        if (groupNames) {
            // Turn on auto complete
            $(this).autocomplete({
                source: groupNames.split(',')
            });
        }
    });
    group.append(groupLabel);
    group.append(groupInput);
    vmAttr.append(group);
        
    // Create node input
    var nodeName = $('<div></div>');
    var nodeLabel = $('<label>Node:</label>');
    var nodeInput = $('<input type="text" name="nodeName" title="You must give a node or a node range. A node range must be given as: node1-node9 or node[1-9]."/>');
    nodeName.append(nodeLabel);
    nodeName.append(nodeInput);
    vmAttr.append(nodeName);

    // Create user ID input
    var userId = $('<div><label>User ID:</label><input type="text" name="userId" title="You must give a user ID or a user ID range. A user ID range must be given as: user1-user9 or user[1-9]."/></div>');
    vmAttr.append(userId);

    // Create hardware control point input
    var hcpDiv = $('<div></div>');
    var hcpLabel = $('<label for="hcp">Hardware control point:</label>');
    var hcpInput = $('<input type="text" name="hcp" title="You must give the System z hardware control point (zHCP) responsible for managing the node(s)"/>');
    hcpInput.blur(function() {
        if ($(this).val()) {
            var args = $(this).val().split('.');
            if (!$.cookie(args[0] + 'diskpools')) {
                // Get disk pools
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : args[0],
                        args : '--diskpoolnames',
                        msg : args[0]
                    },
    
                    success : setDiskPoolCookies
                });
            }
            
            if (!$.cookie(args[0] + 'zfcppools')) {
                // Get zFCP pools
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : args[0],
                        args : '--zfcppoolnames',
                        msg : args[0]
                    },
    
                    success : setZfcpPoolCookies
                });
            }
        }
    });
    hcpDiv.append(hcpLabel);
    hcpDiv.append(hcpInput);
    vmAttr.append(hcpDiv);
    
    // Create an advanced link to set IP address and hostname
    var advancedLnk = $('<div><label><a style="color: blue; cursor: pointer;">Advanced</a></label></div>');
    vmAttr.append(advancedLnk);    
    var advanced = $('<div style="margin-left: 20px;"></div>').hide();
    vmAttr.append(advanced);
    
    var ip = $('<div><label>IP address:</label><input type="text" name="ip" ' + 
        'title="Optional. Specify the IP address that will be assigned to this node. An IP address must be given in the following format: 192.168.0.1."/></div>');
    advanced.append(ip);
    var hostname = $('<div><label>Hostname:</label><input type="text" name="hostname" ' + 
        'title="Optional. Specify the hostname that will be assigned to this node. A hostname must be given in the following format: ihost1.sourceforge.net."/></div>');
    advanced.append(hostname);
    
    // Show IP address and hostname inputs on-click
    advancedLnk.click(function() {
        advanced.toggle();
    });

    // Create operating system image input
    var os = $('<div></div>');
    var osLabel = $('<label for="os">Operating system image:</label>');
    var osSelect = $('<select name="os"></select>');
    osSelect.append($('<option value=""></option>'));
    
    var imageNames = $.cookie('imagenames').split(',');
    if (imageNames) {
    	imageNames.sort();
    	for (var i in imageNames) {
    		osSelect.append($('<option value="' + imageNames[i] + '">' + imageNames[i] + '</option>'));
    	}
    }
    os.append(osLabel);
    os.append(osSelect);
    osAttr.append(os);

    // Create user entry input
    var defaultChkbox = $('<input type="checkbox" name="userEntry" value="default"/>').click(function() {
        // Remove any warning messages
        $(this).parents('.form').find('.ui-state-error').remove();
        
        // Get tab ID
        var thisTabId = $(this).parents('.ui-tabs-panel').attr('id');
        
        // Get objects for HCP, user ID, and OS
        var userId = $('#' + thisTabId + ' input[name=userId]');
        var os = $('#' + thisTabId + ' select[name=os]');
        
        // Get default user entry when clicked
        if ($(this).attr('checked')) {                                    
            if (!os.val() || !userId.val()) {
                // Show warning message
                var warn = createWarnBar('Please specify the operating system and user ID before checking this box');
                warn.prependTo($(this).parents('.form'));
                
                // Highlight empty fields
                jQuery.each([os, userId], function() {
                    if (!$(this).val()) {
                        $(this).css('border', 'solid #FF0000 1px');
                    }                    
                });
            } else {
                // Un-highlight empty fields
                jQuery.each([os, userId], function() {
                    $(this).css('border', 'solid #BDBDBD 1px');
                });

                // Get profile name
                var tmp = os.val().split('-');
                var profile = tmp[3];
                                
                $.ajax({
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'webrun',
                        tgt : '',
                        args : 'getdefaultuserentry;' + profile,
                        msg : thisTabId
                    },
                    
                    success:function(data) {
                        // Populate user entry
                        var tabId = data.msg;
                        var entry = new String(data.rsp);
                        var userId = $('#' + tabId + ' input[name=userId]').val();
                        entry = entry.replace(new RegExp('LXUSR', 'g'), userId);
                        $('#' + tabId + ' textarea:visible').val(entry);
                    }
                });
            } 
        } else {
            $('#' + thisTabId + ' textarea:visible').val('');
            
            // Un-highlight empty fields
            jQuery.each([os, userId], function() {
                $(this).css('border', 'solid #BDBDBD 1px');
            });
        }
    });
    var userEntry = $('<div><label style="vertical-align: top;">Directory entry:</label><textarea/></textarea></div>');
    userEntry.append($('<span></span>').append(defaultChkbox, 'Use default'));
    hwAttr.append(userEntry);

    // Create disk table
    var diskDiv = $('<div class="provision"></div>');
    var diskLabel = $('<label>Disks:</label>');
    var diskTable = $('<table></table>');
    var diskHeader = $('<thead class="ui-widget-header"> <th></th> <th>Type</th> <th>Address</th> <th>Size</th> <th>Mode</th> <th>Pool</th> <th>Password</th> </thead>');
    // Adjust header width
    diskHeader.find('th').css( {
        'width' : '80px'
    });
    diskHeader.find('th').eq(0).css( {
        'width' : '20px'
    });
    var diskBody = $('<tbody></tbody>');
    var diskFooter = $('<tfoot></tfoot>');
    
    /**
     * Add disks
     */
    var addDiskLink = $('<a>Add disk</a>');
    addDiskLink.bind('click', function(event) {
        // Get list of disk pools
        var thisTabId = $(this).parents('.tab').attr('id');
        var thisHcp = $('#' + thisTabId + ' input[name=hcp]').val();
        var definedPools = null;
        if (thisHcp) {
            // Get node without domain name
            var temp = thisHcp.split('.');
            definedPools = $.cookie(temp[0] + 'diskpools').split(',');
        }
        
        // Create a row
        var diskRow = $('<tr></tr>');

        // Add remove button
        var removeBtn = $('<span class="ui-icon ui-icon-close"></span>');
        var col = $('<td></td>').append(removeBtn);
        removeBtn.bind('click', function(event) {
            diskRow.remove();
        });
        diskRow.append(col);

        // Create disk type drop down
        var diskType = $('<td></td>');
        var diskTypeSelect = $('<select></select>');
        diskTypeSelect.append('<option value="3390">3390</option>'
            + '<option value="9336">9336</option>'
        );
        diskType.append(diskTypeSelect);
        diskRow.append(diskType);

        // Create disk address input
        var diskAddr = $('<td><input type="text" title="You must give the virtual device address of the disk to be added"/></td>');
        diskRow.append(diskAddr);

        // Create disk size input
        var diskSize = $('<td><input type="text" title="You must give the size of the disk to be created.  The size value is one of the following: cylinders or block size. "/></td>');
        diskRow.append(diskSize);
        
        // Create disk mode input
        var diskMode = $('<td></td>');
        var diskModeSelect = $('<select></select>');
        diskModeSelect.append('<option value="R">R</option>'
            + '<option value="RR">RR</option>'
            + '<option value="W">W</option>'
            + '<option value="WR">WR</option>'
            + '<option value="M">M</option>'
            + '<option value="MR">MR</option>'
            + '<option value="MW">MW</option>'
        );
        diskMode.append(diskModeSelect);
        diskRow.append(diskMode);
        
        // Create disk pool drop down
        var diskPool = $('<td></td>');
        var diskPoolSelect = $('<select></select>');
        for (var i in definedPools) {
        	diskPoolSelect.append('<option value="' + definedPools[i] + '">' + definedPools[i] + '</option>');
        }
        diskPool.append(diskPoolSelect);
        diskRow.append(diskPool);

        // Create disk password input
        var diskPw = $('<td><input type="password" title="You must give the password that will be used for accessing the disk"/></td>');
        diskRow.append(diskPw);

        diskBody.append(diskRow);
        
        // Generate tooltips
        diskBody.find('td input[title]').tooltip({
            position: "top right",
            offset: [-4, 4],
            effect: "fade",
            opacity: 0.7,
            predelay: 800,
            events: {
                def:     "mouseover,mouseout",
                input:   "mouseover,mouseout",
                widget:  "focus mouseover,blur mouseout",
                tooltip: "mouseover,mouseout"
            }
        });
    });
    
    // Create disk table
    diskFooter.append(addDiskLink);
    diskTable.append(diskHeader);
    diskTable.append(diskBody);
    diskTable.append(diskFooter);
    
    diskDiv.append(diskLabel);
    diskDiv.append(diskTable);
    hwAttr.append(diskDiv);
    
    // Create zFCP table
    var zfcpDiv = $('<div class="provision"></div>');
    var zfcpLabel = $('<label>zFCP:</label>');
    var zfcpTable = $('<table></table>');
    var zfcpHeader = $('<thead class="ui-widget-header"> <th><th>Address</th> <th>Size</th> <th>Pool</th> <th>Tag</th> <th>Port Name</th> <th>Unit #</th> <th>LOADDEV</th></thead>');
    // Adjust header width
    zfcpHeader.find('th').css( {
        'width' : '80px'
    });
    zfcpHeader.find('th').eq(0).css( {
        'width' : '20px'
    });
    var zfcpBody = $('<tbody></tbody>');
    var zfcpFooter = $('<tfoot></tfoot>');
    
    /**
     * Add zFCP devices
     */
    var addZfcpLink = $('<a>Add zFCP</a>');
    addZfcpLink.bind('click', function(event) {
        // Get list of disk pools
        var thisTabId = $(this).parents('.tab').attr('id');
        var thisHcp = $('#' + thisTabId + ' input[name=hcp]').val();
        var definedPools = null;
        if (thisHcp) {
            // Get node without domain name
            var temp = thisHcp.split('.');
            definedPools = $.cookie(temp[0] + 'zfcppools').split(',');
        }
        
        // Create a row
        var zfcpRow = $('<tr></tr>');

        // Add remove button
        var removeBtn = $('<span class="ui-icon ui-icon-close"></span>');
        var col = $('<td></td>').append(removeBtn);
        removeBtn.bind('click', function(event) {
            zfcpRow.remove();
        });
        zfcpRow.append(col);

        // Create disk address input
        var zfcpAddr = $('<td><input type="text" name="zfcpAddr" title="You must give the virtual device address of the device to be added"/></td>');
        zfcpRow.append(zfcpAddr);

        // Create disk size input
        var zfcpSize = $('<td><input type="text" name="zfcpSize" title="You must give the size of the device to be added.  The size value can be one of the following: G(igabtye) or M(egabyte). "/></td>');
        zfcpRow.append(zfcpSize);
        
        // Create zFCP pool drop down
        var zfcpPool = $('<td></td>');
        var zfcpPoolSelect = $('<select name="zfcpPool"></select>');
        for (var i in definedPools) {
        	zfcpPoolSelect.append('<option value="' + definedPools[i] + '">' + definedPools[i] + '</option>');
        }
        zfcpPool.append(zfcpPoolSelect);
        zfcpRow.append(zfcpPool);
                
        // Create disk tag
        var zfcpTag = $('<td><input type="text" name="zfcpTag" title="Optional. You can give a tag for the device. The tag determines how this device will be used."/></td>');
        zfcpRow.append(zfcpTag);

        // Create device port name
        var zfcpPortName = $('<td><input type="text" name="zfcpPortName" title="Optional. You can give the world wide port name for the device."/></td>');
        zfcpRow.append(zfcpPortName);
        
        // Create device unit number
        var zfcpUnitNo = $('<td><input type="text" name="zfcpUnitNo" title="Optional. You can give the logical unit number for the device."/></td>');
        zfcpRow.append(zfcpUnitNo);
        
        // Create LOADDEV checkbox
        var zfcpLoaddev = $('<td><input type="radio" name="zfcpLoaddev" title="Optional. You can specify this device as to be loaded as a result of a guest IPL from SCSI disk."/></td>');
        zfcpRow.append(zfcpLoaddev);

        zfcpBody.append(zfcpRow);
        
        // Generate tooltips
        zfcpBody.find('td input[title]').tooltip({
            position: "top right",
            offset: [-4, 4],
            effect: "fade",
            opacity: 0.7,
            predelay: 800,
            events: {
                def:     "mouseover,mouseout",
                input:   "mouseover,mouseout",
                widget:  "focus mouseover,blur mouseout",
                tooltip: "mouseover,mouseout"
            }
        });
    });
    
    zfcpFooter.append(addZfcpLink);
    zfcpTable.append(zfcpHeader);
    zfcpTable.append(zfcpBody);
    zfcpTable.append(zfcpFooter);
    
    zfcpDiv.append(zfcpLabel);
    zfcpDiv.append(zfcpTable);
    hwAttr.append(zfcpDiv);
    
    // Generate tooltips
    provNew.find('div input[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.7,
        predelay: 800,
        events: {
            def:     "mouseover,mouseout",
            input:   "mouseover,mouseout",
            widget:  "focus mouseover,blur mouseout",
            tooltip: "mouseover,mouseout"
        }
    });
    
    /**
     * Provision new
     */
    var provisionBtn = createButton('Provision');
    provisionBtn.bind('click', function(event) {
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();
        
        var ready = true;
        var errMsg = '';

        // Get tab ID
        var thisTabId = $(this).parents('.ui-tabs-panel').attr('id');
        // Get provision tab instance
        var inst = thisTabId.replace('zvmProvisionTab', '');

        // Check node name, userId, hardware control point, and group
        // Check disks and zFCP devices
        var inputs = $('#' + thisTabId + ' input:visible');
        for ( var i = 0; i < inputs.length; i++) {
            // Do not check some inputs
            if (!inputs.eq(i).val() 
                && inputs.eq(i).attr('type') != 'password'
            	&& inputs.eq(i).attr('name') != 'zfcpTag'
                && inputs.eq(i).attr('name') != 'zfcpPortName'
                && inputs.eq(i).attr('name') != 'zfcpUnitNo') {
                inputs.eq(i).css('border', 'solid #FF0000 1px');
                ready = false;
            } else {
                inputs.eq(i).css('border', 'solid #BDBDBD 1px');
            }
        }
        
        var selects = $('#' + thisTabId + ' select:visible');
        for ( var i = 0; i < selects.length; i++) {
            if (!selects.eq(i).val() && selects.eq(i).attr('name') != 'os') {
            	selects.eq(i).css('border', 'solid #FF0000 1px');
                ready = false;
            } else {
            	selects.eq(i).css('border', 'solid #BDBDBD 1px');
            }
        }

        // Check user entry
        var thisUserEntry = $('#' + thisTabId + ' textarea:visible');
        thisUserEntry.val(thisUserEntry.val().toUpperCase());
        if (!thisUserEntry.val()) {
            thisUserEntry.css('border', 'solid #FF0000 1px');
            ready = false;
        } else {
            thisUserEntry.css('border', 'solid #BDBDBD 1px');
        }
        
        // Show error message for missing inputs
        if (!ready) {
            errMsg = errMsg + 'Please provide a value for each missing field.<br>';
        }

        // Check if user entry contains user ID
        var thisUserId = $('#' + thisTabId + ' input[name=userId]:visible');
        var pos = thisUserEntry.val().indexOf('USER ' + thisUserId.val().toUpperCase());
        if (pos < 0) {
            errMsg = errMsg + 'The directory entry does not contain the correct user ID.<br>';
            ready = false;
        }

        // If no operating system is specified, create only user entry
        os = $('#' + thisTabId + ' select[name=os]:visible');
        
        // Check number of disks
        var diskRows = $('#' + thisTabId + ' table tr');
        // If an OS is given, disks are needed
        if (os.val() && (diskRows.length < 1)) {
            errMsg = errMsg + 'You need to add at some disks.<br>';
            ready = false;
        }
        
        // If inputs are valid, ready to provision
        if (ready) {
            if (!os.val()) {
                // If no OS is given, create a virtual server
                var msg = '';
                if (diskRows.length > 0) {
                    msg = 'Do you want to create a virtual server without an operating system?';
                } else {
                    // If no disks are given, create a virtual server (no disk)
                    msg = 'Do you want to create a virtual server without an operating system or disks?';
                }

                // Open dialog to confirm
                var confirmDialog = $('<div><p>' + msg + '</p></div>');                   
                confirmDialog.dialog({
                    title:'Confirm',
                    modal: true,
                    close: function(){
                        $(this).remove();
                    },
                    width: 400,
                    buttons: {
                        "Ok": function(){
                            // Disable provision button
                            provisionBtn.attr('disabled', 'true');
                            
                            // Show loader
                            $('#zProvisionStatBar' + inst).show();
                            $('#zProvisionLoader' + inst).show();

                            // Disable add disk button
                            addDiskLink.attr('disabled', 'true');
                            
                            // Disable close button on disk table
                            $('#' + thisTabId + ' table span').unbind('click');
                            
                            // Disable all inputs
                            var inputs = $('#' + thisTabId + ' input');
                            inputs.attr('disabled', 'disabled');
                                                
                            // Disable all selects
                            var selects = $('#' + thisTabId + ' select');
                            selects.attr('disabled', 'disabled');
                                                
                            // Add a new line at the end of the user entry
                            var textarea = $('#' + thisTabId + ' textarea');
                            var tmp = jQuery.trim(textarea.val());
                            textarea.val(tmp + '\n');
                            textarea.attr('readonly', 'readonly');
                            textarea.css( {
                                'background-color' : '#F2F2F2'
                            });

                            // Get node name
                            var node = $('#' + thisTabId + ' input[name=nodeName]').val();
                            // Get userId
                            var userId = $('#' + thisTabId + ' input[name=userId]').val();
                            // Get hardware control point
                            var hcp = $('#' + thisTabId + ' input[name=hcp]').val();
                            // Get group
                            var group = $('#' + thisTabId + ' input[name=group]').val();
                            // Get IP address and hostname
                            var ip = $('#' + thisTabId + ' input[name=ip]').val();
                            var hostname = $('#' + thisTabId + ' input[name=hostname]').val();
                                                        
                            // Generate arguments to sent
                            var args = node + ';zvm.hcp=' + hcp
                                + ';zvm.userid=' + userId
                                + ';nodehm.mgt=zvm'
                                + ';groups=' + group;
                            if (ip) 
                                args += ';hosts.ip=' + ip;
                            
                            if (hostname)
                                args += ';hosts.hostnames=' + hostname;

                            /**
                             * (1) Define node
                             */
                            $.ajax( {
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'nodeadd',
                                    tgt : '',
                                    args : args,
                                    msg : 'cmd=nodeadd;out=' + inst
                                },

                                success : updateZProvisionNewStatus
                            });
                                                        
                            $(this).dialog("close");
                        },
                        "Cancel": function() {
                            $(this).dialog("close");
                        }
                    }
                });    
            } else {
                /**
                 * Create a virtual server and install OS
                 */

                // Disable provision button
                $(this).attr('disabled', 'true');
                
                // Show loader
                $('#zProvisionStatBar' + inst).show();
                $('#zProvisionLoader' + inst).show();

                // Disable add disk button
                addDiskLink.attr('disabled', 'true');
                
                // Disable close button on disk table
                $('#' + thisTabId + ' table span').unbind('click');

                // Disable all inputs
                var inputs = $('#' + thisTabId + ' input');
                inputs.attr('disabled', 'disabled');
                inputs.css( {
                    'background-color' : '#F2F2F2'
                });
                
                // Disable all selects
                var selects = $('#' + thisTabId + ' select');
                selects.attr('disabled', 'disabled');
                selects.css( {
                    'background-color' : '#F2F2F2'
                });
                
                // Add a new line at the end of the user entry
                var textarea = $('#' + thisTabId + ' textarea');
                var tmp = jQuery.trim(textarea.val());
                textarea.val(tmp + '\n');
                textarea.attr('readonly', 'readonly');
                textarea.css( {
                    'background-color' : '#F2F2F2'
                });

                // Get node name
                var node = $('#' + thisTabId + ' input[name=nodeName]').val();
                // Get userId
                var userId = $('#' + thisTabId + ' input[name=userId]').val();
                // Get hardware control point
                var hcp = $('#' + thisTabId + ' input[name=hcp]').val();
                // Get group
                var group = $('#' + thisTabId + ' input[name=group]').val();
                // Get IP address and hostname
                var ip = $('#' + thisTabId + ' input[name=ip]').val();
                var hostname = $('#' + thisTabId + ' input[name=hostname]').val();
                                
                // Generate arguments to sent
                var args = node + ';zvm.hcp=' + hcp
                    + ';zvm.userid=' + userId
                    + ';nodehm.mgt=zvm'
                    + ';groups=' + group;
                if (ip) 
                    args += ';hosts.ip=' + ip;
                
                if (hostname)
                    args += ';hosts.hostnames=' + hostname;

                /**
                 * (1) Define node
                 */
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'nodeadd',
                        tgt : '',
                        args : args,
                        msg : 'cmd=nodeadd;out=' + inst
                    },

                    success : updateZProvisionNewStatus
                });
            }
        } else {
            // Show warning message
            var warn = createWarnBar(errMsg);
            warn.prependTo($(this).parent().parent());
        }
    });
    provNew.append(provisionBtn);
    
    return provNew;
}

/**
 * Load zVMs into column (service page)
 * 
 * @param col Table column where OS images will be placed
 */
function loadzVMs(col) {
    // Get group names and description and append to group column
    var groupNames = $.cookie('srv_zvms').split(',');
    var radio, zvmBlock, args, zvm, hcp;
    for (var i in groupNames) {
        args = groupNames[i].split(':');
        zvm = args[0];
        hcp = args[1];
        
        // Create block for each group
        zvmBlock = $('<div class="ui-state-default"></div>').css({
            'border': '1px solid',
            'max-width': '200px',
            'margin': '5px auto',
            'padding': '5px',
            'display': 'block', 
            'vertical-align': 'middle',
            'cursor': 'pointer',
            'white-space': 'normal'
        }).click(function(){
            $(this).children('input:radio').attr('checked', 'checked');
            $(this).parents('td').find('div').attr('class', 'ui-state-default');
            $(this).attr('class', 'ui-state-active');
        });
        radio = $('<input type="radio" name="hcp" value="' + hcp + '"/>').css('display', 'none');
        zvmBlock.append(radio, $('<span style="font-weight: normal;"><b>' + zvm + '</b> managed by ' + hcp + '</span>'));
        zvmBlock.children('span').css({
            'display': 'block',
            'margin': '5px',
            'text-align': 'left'
        });
        col.append(zvmBlock);
    }
}

/**
 * Load groups into column
 * 
 * @param col Table column where OS images will be placed
 */
function loadSrvGroups(col) {
    // Get group names and description and append to group column
    var groupNames = $.cookie('srv_groups').split(',');
    var groupBlock, radio, args, name, ip, hostname, desc;
    for (var i in groupNames) {
        args = groupNames[i].split(':');
        name = args[0];
        ip = args[1];
        hostname = args[2];
        desc = args[3];
        
        // Create block for each group
        groupBlock = $('<div class="ui-state-default"></div>').css({
            'border': '1px solid',
            'max-width': '200px',
            'margin': '5px auto',
            'padding': '5px',
            'display': 'block', 
            'vertical-align': 'middle',
            'cursor': 'pointer',
            'white-space': 'normal'
        }).click(function(){
            $(this).children('input:radio').attr('checked', 'checked');
            $(this).parents('td').find('div').attr('class', 'ui-state-default');
            $(this).attr('class', 'ui-state-active');
        });
        radio = $('<input type="radio" name="group" value="' + name + '"/>').css('display', 'none');
        groupBlock.append(radio, $('<span style="font-weight: normal;"><b>' + name + '</b>: ' + desc + '</span>'));
        groupBlock.children('span').css({
            'display': 'block',
            'margin': '5px',
            'text-align': 'left'
        });
        col.append(groupBlock);
    }
}

/**
 * Load OS images into column
 * 
 * @param col Table column where OS images will be placed
 */
function loadOSImages(col) {
    // Get group names and description and append to group column
    var imgNames = $.cookie('srv_imagenames').split(',');
    var imgBlock, radio, args, name, desc;
    for (var i in imgNames) {
        args = imgNames[i].split(':');
        name = args[0];
        desc = args[1];
        
        // Create block for each image
        imgBlock = $('<div class="ui-state-default"></div>').css({
            'border': '1px solid',
            'max-width': '200px',
            'margin': '5px auto',
            'padding': '5px',
            'display': 'block', 
            'vertical-align': 'middle',
            'cursor': 'pointer',
            'white-space': 'normal'
        }).click(function(){
            $(this).children('input:radio').attr('checked', 'checked');
            $(this).parents('td').find('div').attr('class', 'ui-state-default');
            $(this).attr('class', 'ui-state-active');
        });
        radio = $('<input type="radio" name="image" value="' + name + '"/>').css('display', 'none');
        imgBlock.append(radio, $('<span style="font-weight: normal;"><b>' + name + '</b>: ' + desc + '</span>'));
        imgBlock.children('span').css({
            'display': 'block',
            'margin': '5px',
            'text-align': 'left'
        });
        col.append(imgBlock);
    }
}

/**
 * Set a cookie for zVM host names (service page)
 * 
 * @param data Data from HTTP request
 */
function setzVMCookies(data) {
    if (data.rsp) {
        var zvms = new Array();
        for ( var i = 0; i < data.rsp.length; i++) {
            zvms.push(data.rsp[i]);
        }
        
        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (240 * 60 * 1000));
        $.cookie('srv_zvms', zvms, { expires: exDate });
    }
}

/**
 * Set a cookie for disk pool names of a given node
 * 
 * @param data Data from HTTP request
 */
function setDiskPoolCookies(data) {
    if (data.rsp) {
        var node = data.msg;
        var pools = data.rsp[0].split(node + ': ');
        for (var i in pools) {
            pools[i] = jQuery.trim(pools[i]);
        }
        
        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (240 * 60 * 1000));
        $.cookie(node + 'diskpools', pools, { expires: exDate });
    }
}

/**
 * Set a cookie for zFCP pool names of a given node
 * 
 * @param data Data from HTTP request
 */
function setZfcpPoolCookies(data) {
    if (data.rsp) {
        var node = data.msg;
        var pools = data.rsp[0].split(node + ': ');
        for (var i in pools) {
            pools[i] = jQuery.trim(pools[i]);
        }
        
        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (240 * 60 * 1000));
        $.cookie(node + 'zfcppools', pools, { expires: exDate });
    }
}

/**
 * Create virtual machine (service page)
 * 
 * @param tabId Tab ID
 * @param group Group
 * @param hcp Hardware control point
 * @param img OS image
 */
function createzVM(tabId, group, hcp, img, owner) {
    // Submit request to create VM
    // webportal provzlinux [group] [hcp] [image] [owner]
    var iframe = createIFrame('lib/srv_cmd.php?cmd=webportal&tgt=&args=provzlinux;' + group + ';' + hcp + ';' + img + ';' + owner + '&msg=&opts=flush');
    iframe.prependTo($('#' + tabId));
}

/**
 * Query the profiles that exists
 * 
 * @param panelId Panel ID
 */
function queryProfiles(panelId) {
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'tabdump',
            tgt : '',
            args : 'osimage',
            msg : panelId
        },

        success : function(data) {
            var panelId = data.msg;
            setOSImageCookies(data);
            configProfilePanel(panelId);
        }
    });
}

/**
 * Panel to configure directory entries and disks for a profile
 * 
 * @param panelId Panel ID
 */
function configProfilePanel(panelId) {    
    // Wipe panel clean
    $('#' + panelId).empty();

    // Add info bar
    $('#' + panelId).append(createInfoBar('Create, edit, and delete profiles for the self-service portal. It is important to note the default z/VM user ID for any profile should be LXUSR.'));
    
    // Create table
    var tableId = 'zvmProfileTable';
    var table = new DataTable(tableId);
    table.init(['<input type="checkbox" onclick="selectAllCheckbox(event, $(this))">', 'Profile', 'Disk pool', 'Disk size', 'Directory entry']);

    // Insert profiles into table
    var profiles = $.cookie('profiles').split(',');
    profiles.push('default'); // Add default profile
    for (var i in profiles) {
        if (profiles[i]) {
            // Columns are: profile, selectable, description, disk pool, disk size, and directory entry
            var cols = new Array(profiles[i], '', '', '');
    
            // Add remove button where id = user name
            cols.unshift('<input type="checkbox" name="' + profiles[i] + '"/>');
    
            // Add row
            table.add(cols);
        }
    }
    
    // Append datatable to tab
    $('#' + panelId).append(table.object());

    // Turn into datatable
    $('#' + tableId).dataTable({
        'iDisplayLength': 50,
        'bLengthChange': false,
        "sScrollX": "100%",
        "bAutoWidth": true
    });
    
    // Create action bar
    var actionBar = $('<div class="actionBar"></div>');
    
    // Create a profile
    var createLnk = $('<a>Create</a>');
    createLnk.click(function() {
        profileDialog();
    });
    
    // Edit a profile
    var editLnk = $('<a>Edit</a>');
    editLnk.click(function() {
        var profiles = $('#' + tableId + ' input[type=checkbox]:checked');
        for (var i in profiles) {
            var profile = profiles.eq(i).attr('name');            
            if (profile) {
                // Column order is: profile, selectable, disk pool, disk size, and directory entry
                var cols = profiles.eq(i).parents('tr').find('td');
                var pool = cols.eq(2).text();
                var size = cols.eq(3).text();
                var entry = cols.eq(4).html().replace(new RegExp('<br>', 'g'), '\n');
                
                editProfileDialog(profile, pool, size, entry);
            }
        }
    });
        
    // Delete a profile
    var deleteLnk = $('<a>Delete</a>');
    deleteLnk.click(function() {
        var profiles = getNodesChecked(tableId);
        if (profiles) {
            openDeleteProfileDialog(profiles);
        }
    });
    
    // Refresh profiles table
    var refreshLnk = $('<a>Refresh</a>');
    refreshLnk.click(function() {
        queryProfiles(panelId);
    });
    
    // Create an action menu
    var actionsMenu = createMenu([createLnk, editLnk, deleteLnk, refreshLnk]);
    actionsMenu.superfish();
    actionsMenu.css('display', 'inline-block');
    actionBar.append(actionsMenu);
    
    // Set correct theme for action menu
    actionsMenu.find('li').hover(function() {
        setMenu2Theme($(this));
    }, function() {
        setMenu2Normal($(this));
    });
    
    // Create a division to hold actions menu
    var menuDiv = $('<div id="' + tableId + '_menuDiv" class="menuDiv"></div>');
    $('#' + tableId + '_wrapper').prepend(menuDiv);
    menuDiv.append(actionBar);    
    $('#' + tableId + '_filter').appendTo(menuDiv);

    // Resize accordion
    $('#' + tableId).parents('.ui-accordion').accordion('resize');
    
    // Query directory entries and disk pool/size for each profile
    for (var i in profiles) {
        $.ajax({
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'webrun',
                tgt : '',
                args : 'getdefaultuserentry;' + profiles[i],
                msg : 'out=' + panelId + ';profile=' + profiles[i]
            },
            
            success: insertDirectoryEntry
        });
        
        $.ajax({
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'webrun',
                tgt : '',
                args : 'getzdiskinfo;' + profiles[i],
                msg : 'out=' + panelId + ';profile=' + profiles[i]
            },
            
            success: insertDiskInfo
        });
    }
}

/**
 * Insert the directory entry into the profile table
 * 
 * @param data Data from HTTP request
 */
function insertDirectoryEntry(data) {
    var tableId = 'zvmProfileTable';
    var args = data.msg.split(';');
    
    var profile = args[1].replace('profile=', '');
    
    // Do not continue if there is nothing
    if (!data.rsp.length)
        return;
    
    var entry = data.rsp[0].replace(new RegExp('\n', 'g'), '<br/>');
    
    // Get the row containing the profile
    var rowPos = findRow(profile, '#' + tableId, 1);
    if (rowPos < 0)
        return;

    // Update the directory entry column
    var dTable = $('#' + tableId).dataTable();
    dTable.fnUpdate(entry, rowPos, 4, false);
    
    // Adjust table styling
    $('#' + tableId + ' td:nth-child(5)').css({
        'text-align': 'left'
    });
    adjustColumnSize(tableId);
}

/**
 * Insert the disk info into the profile table
 * 
 * @param data Data from HTTP request
 */
function insertDiskInfo(data) {
    var tableId = 'zvmProfileTable';
    var args = data.msg.split(';');
    
    var profile = args[1].replace('profile=', '');
    
    // Do not continue if there is nothing
    if (!data.rsp.length)
        return;
    
    // Get the row containing the profile
    var rowPos = findRow(profile, '#' + tableId, 1);
    if (rowPos < 0)
        return;
    
    // Update the disk info columns
    var dTable = $('#' + tableId).dataTable();
    
    var tmp = "";
    var pool = "";
    var eckdSize = 0;
    var info = data.rsp[0].split('\n');
    for (var i in info) {
        if (info[i].indexOf('diskpool') > -1) {
            tmp = info[i].split('=');
            pool = jQuery.trim(tmp[1]);
            
            dTable.fnUpdate(pool, rowPos, 2, false);
        } if (info[i].indexOf('eckd_size') > -1) {
            tmp = info[i].split('=');
            eckdSize = jQuery.trim(tmp[1]);
            
            dTable.fnUpdate(eckdSize, rowPos, 3, false);
        }            
    }
    
    // Adjust table styling
    adjustColumnSize(tableId);
}

/**
 * Open profile dialog
 */
function profileDialog() {
    // Create form to add profile
    var dialogId = 'zvmCreateProfile';
    var profileForm = $('<div id="' + dialogId + '" class="form"></div>');
    
    // Create info bar
    var info = createInfoBar('Configure the default settings for a profile');
    profileForm.append(info);
    
    // Insert profiles into select
    var profileSelect = $('<select name="profile"></select>');
    var profiles = $.cookie('profiles').split(',');
    profiles.push('default'); // Add default profile
    for (var i in profiles) {
        if (profiles[i]) {
            profileSelect.append($('<option>' + profiles[i] + '</option>'));
        }
    }
    
    profileForm.append($('<div><label>Profile:</label></div>').append(profileSelect));
    profileForm.append('<div><label>Disk pool:</label><input type="text" name="disk_pool"/></div>');
    profileForm.append('<div><label>Disk size (ECKD):</label><input type="text" name="disk_size_eckd"/></div>');
    profileForm.append('<div><label style="vertical-align: top;">Directory entry:</label><textarea name="directory_entry"/></div>');
        
    // Open dialog to add processor
    profileForm.dialog({
        title:'Configure profile',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 600,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                // Find profile attributes
                var profile = $(this).find('select[name=profile]').val();
                var pool = $(this).find('input[name=disk_pool]').val();
                var size = $(this).find('input[name=disk_size_eckd]').val();
                var entry = $(this).find('textarea[name=directory_entry]').val();
                
                // If inputs are not complete, show warning message
                if (!profile || !pool || !size || !entry) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Change dialog buttons
                    $('#' + dialogId).dialog('option', 'buttons', {
                        'Close':function(){
                            $(this).dialog('close');
                        }
                    });
                    
                    // Write file to /var/tmp
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'write',
                            tgt : '/var/tmp/' + profile + '.direct',
                            args : '',
                            cont : entry,
                            msg : dialogId + ';' + profile + ';' + pool + ';' + size
                        },

                        success : function(data) {
                            var args = data.msg.split(';');
                                                        
                            // Create profile in xCAT
                            $.ajax({
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'webrun',
                                    tgt : '',
                                    args : 'mkzprofile;' + args[1] + ';' + args[2] + ';' + args[3],
                                    msg : args[0]
                                },
                                
                                success: updatePanel
                            });
                        }
                    });
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to confirm profile delete
 * 
 * @param profiles Profiles to delete
 */
function deleteProfileDialog(profiles) {
    // Create form to delete disk to pool
    var dialogId = 'zvmDeleteProfile';
    var deleteForm = $('<div id="' + dialogId + '" class="form"></div>');
    
    // Create info bar
    var info = createInfoBar('Are you sure you want to delete ' + profiles.replace(new RegExp(',', 'g'), ', ') + '?');
    deleteForm.append(info);
            
    // Open dialog to delete user
    deleteForm.dialog({
        title:'Delete profile',
        modal: true,
        width: 400,
        close: function(){
            $(this).remove();
        },
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });
                                        
                // Delete user
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'webrun',
                        tgt : '',
                        args : 'rmzprofile;' + profiles,
                        msg : dialogId
                    },
                    success : updatePanel
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to edit profile
 * 
 * @param profile Profile to edit
 * @param pool Disk pool
 * @param size Disk size
 * @param entry Directory entry
 */
function editProfileDialog(profile, pool, size, entry) {
    // Create form to add profile
    var dialogId = 'zvmEditProfile_' + profile;
    var profileForm = $('<div id="' + dialogId + '" class="form"></div>');
    
    // Create info bar
    var info = createInfoBar('Configure the default settings for a profile');
    profileForm.append(info);
    
    // Insert profiles into select
    var profileSelect = $('<select name="profile"></select>');
    var profiles = $.cookie('profiles').split(',');
    profiles.push('default'); // Add default profile
    for (var i in profiles) {
        if (profiles[i]) {
            profileSelect.append($('<option value="' + profiles[i] + '">' + profiles[i] + '</option>'));
        }
    }
    
    profileForm.append($('<div><label>Profile:</label></div>').append(profileSelect));
    profileForm.append('<div><label>Disk pool:</label><input type="text" name="disk_pool"/></div>');
    profileForm.append('<div><label>Disk size (ECKD):</label><input type="text" name="disk_size_eckd"/></div>');
    profileForm.append('<div><label style="vertical-align: top;">Directory entry:</label><textarea name="directory_entry"/></div>');
        
    // Insert profile values
    profileSelect.val(profile);
    profileForm.find('input[name=disk_pool]').val(pool);
    profileForm.find('input[name=disk_size_eckd]').val(size);
    profileForm.find('textarea[name=directory_entry]').val(entry);
    
    // Open dialog to add processor
    profileForm.dialog({
        title:'Configure profile',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 600,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();
                
                // Find profile attributes
                var profile = $(this).find('select[name=profile]').val();
                var pool = $(this).find('input[name=disk_pool]').val();
                var size = $(this).find('input[name=disk_size_eckd]').val();
                var entry = $(this).find('textarea[name=directory_entry]').val();
                
                // If inputs are not complete, show warning message
                if (!profile || !pool || !size || !entry) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Change dialog buttons
                    $('#' + dialogId).dialog('option', 'buttons', {
                        'Close':function(){
                            $(this).dialog('close');
                        }
                    });
                    
                    // Write file to /var/tmp
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'write',
                            tgt : '/var/tmp/' + profile + '.direct',
                            args : '',
                            cont : entry,
                            msg : dialogId + ';' + profile + ';' + pool + ';' + size
                        },

                        success : function(data) {
                            var args = data.msg.split(';');
                                                        
                            // Create profile in xCAT
                            $.ajax({
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'webrun',
                                    tgt : '',
                                    args : 'mkzprofile;' + args[1] + ';' + args[2] + ';' + args[3],
                                    msg : args[0]
                                },
                                
                                success: updatePanel
                            });
                        }
                    });
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}