/* PHEDEX.Login
 * This is Phedex login component that allows user to login into PhEDEx system using password or certificates 
 * and thereby also view user role information. auth data service is used for user authentication
*/
PHEDEX.namespace('Login');
PHEDEX.Login = (function() {
    var PxU = PHEDEX.Util;
    var PxD = PHEDEX.Datasvc;

    /**
    * _cur_state indicates the current state (login, logout, certlogin, usepassword)
    * login       - use password based authentication.
    * logout      - authenticated using password based authentication and can view his role info
    * certlogin   - use certificate based authentication.
    * usepassword - authenticated using certificate based authentication and can login using password based auth
    */
    var _cur_state = '';    //Current state of browser authentication
    var _logincomp = {};    //Login component main HTML element
    var _username = '';     //Login user name
    var _authData = null;   //Response received from auth data service call
    var _closebtn = null;   //The close button in YUI overlay
    var _bVisible = false;  //Stores the current status of overlay if it is visible or not
    var _user_role_info = null; //The YUI overlay object that has user role information
    var _username_id = 'phedex-login-usrname'; //Used for positioning overlay while display

    /**
    * @method _showOverlay
    * @description This displays the user role information as YUI overlay dialog.
    */
    var _showOverlay = function() {
        if (!_authData.role) {
            //There is no user role information in the received response
            alert('There is no role assigned to this user.');
            return;
        }
        if (_user_role_info) {
            //The YUI overlay is filled with user role information
            if (_bVisible) {
                _user_role_info.hide(); //Hide the YUI overlay if it is visible to user
                _bVisible = false;
                YAHOO.log('The user role information is hidden now', 'info', 'Phedex.Login');
            }
            else {
                _user_role_info.show(); //Show the YUI overlay if it is not visible to user
                _bVisible = true;
                YAHOO.log('The user role information is shown now', 'info', 'Phedex.Login');
            }
        }
    }

    /**
    * @method _closeOverlay
    * @description This hides the user role information (YUI overlay dialog).
    */
    var _closeOverlay = function() {
        _user_role_info.hide();
        _bVisible = false;
        YAHOO.log('The user role information is hidden now', 'info', 'Phedex.Login');
    }

    /**
    * @method _formUserInfo
    * @description This creates the YUI overlay object and creates a table in overlay object to populate
    * the user role information.
    */
    var _formUserInfo = function() {
        if (_authData.role) {
            if (_authData.role.length > 0) {
                if (!_user_role_info) {
                    //Create a new YUI overlay to show user role information
                    _user_role_info = new YAHOO.widget.Overlay("_user_role_info", { context: [_username_id, "tl", "bl", ["beforeShow", "windowResize"]], visible: false, width: "300px" });
                    YAHOO.log('The user role information YUI overlay is created', 'info', 'Phedex.Login');
                }
                else {
                    //Delete the previous YUI overlay body content
                    while (_user_role_info.body.hasChildNodes()) {
                        _user_role_info.body.removeChild(_user_role_info.body.lastChild);
                    }
                    YAHOO.log('The user role information YUI overlay body content is destroyed', 'info', 'Phedex.Login');
                }
                var overlayBody = document.createElement('div');
                overlayBody.className = 'phedex-login-overlay-body';
                var title = document.createElement('div');
                title.innerHTML = 'User Role Information';
                overlayBody.appendChild(title);
                overlayBody.appendChild(document.createElement('br'));
                var tableUserInfo = document.createElement('table'); //Create a table to show user role information
                tableUserInfo.border = 3;
                tableUserInfo.cellSpacing = 3;
                tableUserInfo.cellPadding = 3;
                var indx = 0, tableRow, tableCell1, tableCell2;
                for (indx = 0; indx < _authData.role.length; indx++) {
                    //Create rows in the table to fill user role information 
                    tableRow = tableUserInfo.insertRow(0);
                    tableCell1 = tableRow.insertCell(0);
                    tableCell2 = tableRow.insertCell(1);
                    tableCell1.innerHTML = _authData.role[indx].name;
                    tableCell2.innerHTML = _authData.role[indx].group;
                }
                tableRow = tableUserInfo.insertRow(0);
                tableRow.className = 'phedex-login-userrole';
                tableCell1 = tableRow.insertCell(0);
                tableCell2 = tableRow.insertCell(1);
                tableCell1.innerHTML = 'Name';
                tableCell2.innerHTML = 'Group';
                overlayBody.appendChild(tableUserInfo);
                overlayBody.appendChild(document.createElement('br'));
                var closebtn = document.createElement('div');
                closebtn.id = 'phedex-login-info-close';
                overlayBody.appendChild(closebtn);
                _user_role_info.setBody(overlayBody);   //Fill the YUI overlay body with user role information table
                _user_role_info.render(document.body);  //Render the YUI overlay
                YAHOO.log('The user role information YUI overlay is rendered', 'info', 'Phedex.Login');
                //Create a button within YUI overlay to allow user to hide YUI overlay (on clicking the button)
                _closebtn = new YAHOO.widget.Button({ label: "Close", id: "buttonClose", container: 'phedex-login-info-close', onclick: { fn: _closeOverlay} });
                YAHOO.log('The user role information YUI overlay body content close button is created', 'info', 'Phedex.Login');
            }
        }
    };

    /**
    * @method _parseUserDN
    * @description This parses the user DN string and returns the key with its values.
    * @param {String} strUserDN specifies the user DN obtained from auth data service call.
    */
    var _parseUserDN = function(strUserDN) {
        //This is temporary function to get user name from DN. This has to be removed after auth data service call gives user name specifically
        var strTemp = '', indx = 0, strDN = "";
        var arrResult = {};
        var arrDNInfo = strUserDN.split('/');
        for (indx = 0; indx < arrDNInfo.length; indx++) {
            if (arrDNInfo[indx].length > 0) {
                strTemp = arrDNInfo[indx].split('=');
                if (strTemp.length > 0) {
                    if ((strTemp[0] == 'CN') && (strTemp[1].length > 0)) {
                        if (strDN.length < strTemp[1].length) {
                            strDN = strTemp[1];
                        }
                    }
                }
            }
        }
        var regexDN = /^(.*?)[\d]*$/g;
        var regexpDN = new RegExp(regexDN);
        arrDNInfo = regexpDN.exec(strDN);
        if (arrDNInfo.length > 1) {
            strDN = arrDNInfo[1].trim();
        }
        YAHOO.log('The user name from DN is obtained', 'info', 'Phedex.Login');
        return strDN;
    };

    /**
    * @method _validateLogin
    * @description The validates if user authentication succeeded or not
    * @param {Object} data is the reponse received from from auth data service call.
    */
    var _validateLogin = function(data) {
        if (!data.auth) { //Check if reponse has auth info (to be on safer side)
            return false;
        }
        else {
            if (data.auth.state == 'failed') { //Authentication failed
                return false;
            }
        }
        return true; //Authentication succeeded
    }

    /**
    * @method _processLogin
    * @description The response received from from auth data service call is processed and UI is 
    * updated based on authentication type
    * @param {Object} data is the reponse received from from auth data service call.
    */
    var _processLogin = function(data) {
        if (_cur_state == 'login') {
            //This is temporary.. simulating the password based authentication
            //This has to be removed later after auth data service call supports password based authentication
            data = {};
            data["auth"] = { 'state': 'passwd'};
        }
        var bsucceed = _validateLogin(data);
        YAHOO.log('The user login is validated. User credentials are ' + bsucceed, 'info', 'Phedex.Login');
        if (bsucceed) { //Authentication succeeded
            _authData = data.auth; //The user data is saved for further use
            if (data.auth.state == 'cert') { //Authentication done using certificate
                _username = 'Unknown User';
                var strUserDN = _parseUserDN(data.auth.dn); //Get the user name from DN
                if (strUserDN) {
                    _username = strUserDN;
                }
                _logincomp.username.innerHTML = _username;
                _logincomp.statusmsg.innerHTML = ' logged in via certificate';
                _cur_state = 'usepassword';
                _updateLoginButton('Use Password');
            }
            else if (data.auth.state == 'passwd') { //Authentication done using password
                _username = _logincomp.inputname.value;
                _logincomp.username.innerHTML = _username;
                _logincomp.statusmsg.innerHTML = ' logged in via password';
                _cur_state = 'logout';
                _updateLoginButton('Log Out');
            }
            YAHOO.util.Dom.addClass(_logincomp.logininput, 'phedex-invisible'); //Hide the login input elements
            YAHOO.log('Updated valid user login authentication info on UI', 'info', 'Phedex.Login');
            _formUserInfo(); //Form the overlay object if authentication succeeded
        }
        else { //Authentication failed
            if (_cur_state != 'certlogin') {
                //Alert user if authentication failed in password mode
                alert('Login failed. Please check login user credential details.');
            }
            _resetLoginState(); //Set the mode to password state if authentication is failed
        }
    };

    /**
    * @method _loginCallFailure
    * @description This gets called when there is some problem in making auth data service call 
    * and user is informed about this
    * @param {Object} data is the error reponse received.
    */
    var _loginCallFailure = function(data) {
        alert('Unable to login. Please try again.');
        YAHOO.log('Unable to login because of communication failure to make data service call', 'error', 'Phedex.Login');
    };

    var _eventSuccess = new YAHOO.util.CustomEvent('login success');
    var _eventFailure = new YAHOO.util.CustomEvent('login failure');

    _eventSuccess.subscribe(function(type, args) { _processLogin(args[0]); });
    _eventFailure.subscribe(function(type, args) { _loginCallFailure(args[0]); });

    /**
    * @method _onLogin
    * @description This gets called when user click the button and process user request based on authenticatoin mode 
    * @param {Object} event is the event data.
    */
    var _onLogin = function(event) {
        if (_bVisible) {
            //Hide YUI overlay user role information just in case if it is open before changing current state
            _user_role_info.hide();
            _bVisible = false;
        }
        if (_cur_state == 'login') {
            if (!_logincomp.inputname.value) {
                alert('Please enter user name');
                return;
            }
            if (!_logincomp.inputpwd.value) {
                alert('Please enter password');
                return;
            }
            var _pwd = _logincomp.inputpwd.value;
            _username = _logincomp.inputname.value;
            //NOTE:Actually the below data service call will be changed later after "auth" supports password based authentication
            //As of now dummy call is made to bounce for password based authentication
            YAHOO.log('Auth data service call is made for password based authentication', 'info', 'Phedex.Login');
            PHEDEX.Datasvc.Call({ api: 'bounce', success_event: _eventSuccess, failure_event: _eventFailure });
        }
        else if (_cur_state == 'logout') {
            _resetLoginState();
            YAHOO.log('Login components are reset as use clicked logout', 'info', 'Phedex.Login');
        }
        else if (_cur_state == 'usepassword') {
            _resetLoginState();
            _username = '';
            YAHOO.log('Login components are reset as use clicked use password', 'info', 'Phedex.Login');
        }
    };

    /**
    * @method _updateLoginButton
    * @description This updates the text of the button based on current authentication mode 
    * @param {Object} event is the event data.
    */
    var _updateLoginButton = function(status) {
        _logincomp.objBtn.set('label', status);
    };

    /**
    * @method _loginUsingCert
    * @description This makes data service call to authenticate using certificate
    */
    var _loginUsingCert = function() {
        _cur_state = 'certlogin';
        YAHOO.log('Auth data service call is made for certificate based authentication', 'info', 'Phedex.Login');
        PHEDEX.Datasvc.Call({ api: 'auth', success_event: _eventSuccess, failure_event: _eventFailure });
    };

    /**
    * @method _resetLoginState
    * @description This resets the UI back to login mode i.e show user name and password text box
    */
    var _resetLoginState = function() {
        YAHOO.util.Dom.removeClass(_logincomp.logininput, 'phedex-invisible'); //Show the login elements
        _logincomp.inputpwd.value = '';
        _logincomp.inputname.value = '';
        _logincomp.username.innerHTML = '';
        _logincomp.statusmsg.innerHTML = '';
        _updateLoginButton('Login');
        _cur_state = 'login';
    };

    /**
    * @method _initLoginComponent
    * @description This creates the login component
    * @param {HTML element} divlogin element specifies element where login component should be built
    */
    var _initLoginComponent = function(divlogin) {
        var logincomp = PxU.makeChild(divlogin, 'div', { id: 'phedex-nav-login', className: 'phedex-login' });
        logincomp.username = PxU.makeChild(logincomp, 'a', { className: 'phedex-login-username' });
        logincomp.username.id = _username_id;
        logincomp.statusmsg = PxU.makeChild(logincomp, 'span', { className: 'phedex-login-status' });
        logincomp.logininput = PxU.makeChild(logincomp, 'span', { className: 'phedex-invisible' });
        var labelname = PxU.makeChild(logincomp.logininput, 'span');
        labelname.innerHTML = 'User Name: ';
        logincomp.inputname = PxU.makeChild(logincomp.logininput, 'input', { type: 'text' });
        labelname = PxU.makeChild(logincomp.logininput, 'span');
        labelname.innerHTML = '&nbsp;Password: ';
        logincomp.inputpwd = PxU.makeChild(logincomp.logininput, 'input', { type: 'password' });
        var btnsubmit = PxU.makeChild(logincomp, 'span');
        YAHOO.util.Event.addListener(logincomp.username, 'click', _showOverlay, this, true);
        logincomp.objBtn = new YAHOO.widget.Button({ label: 'Login', id: 'buttonOK', container: btnsubmit, onclick: { fn: _onLogin} });
        _logincomp = logincomp;
        YAHOO.log('The login component is created', 'info', 'Phedex.Login');
    };

    return {
        /**
        * @method init
        * @description This creates the login component
        * @param {HTML element} el element specifies element where login component should be built
        */
        init: function(el) {
            _initLoginComponent(el);
            _loginUsingCert();
        }
    };
})();

//This is to trim the string
String.prototype.trim = function() {
    return (this.replace(/^\s+|\s+$/g, ""));
}