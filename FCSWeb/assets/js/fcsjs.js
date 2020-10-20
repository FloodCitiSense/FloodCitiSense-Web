function initI18next() {
    i18next
        .use(i18nextBrowserLanguageDetector)
        .use(i18nextXHRBackend)
        .init({
            'fallbackLng': 'en',
            'debug': false,
            'ns': 'translation',
            'defaultNS': 'translation',
            'backend': {
                'loadPath': 'locales/{{lng}}/{{ns}}.json',
                'crossDomain': true
            }
        }, function (err, t) {
            // for options see
            // https://github.com/i18next/jquery-i18next#initialize-the-plugin
            jqueryI18next.init(i18next, $);
            // start localizing, details:
            // https://github.com/i18next/jquery-i18next#usage-of-selector-function
            setNavCurrentLanguage(i18next.language);
            langChangeAnchor();
        });
}

function changeLang(lang) {
    i18next.changeLanguage(lang, (err, t) => {
        if (err) return console.log('something went wrong loading', err);
        //$('body').localize();
        setNavCurrentLanguage(lang);
        langChangeAnchor(lang);
    });
}

function get_viewers_ip(json) {
    viewers_ip = json.ip;
    var ip_to_string = viewers_ip.toString();
    for (var i, i = 0; i < ip_to_string.length; i++) {
        ip_to_string = ip_to_string.replace(".", "-");
    }
    if (sessionStorage.getItem('fcs_page_views_count') == null) {
        var keyIPDate = ip_to_string + "-" + moment().tz('Europe/London').format('YYYY-MM-DD');
        //console.log(keyIPDate)
        firebase.database().ref('page_views/' + keyIPDate).set({
            viewers_ip: viewers_ip,
            //email: ip_to_string,
            //profile_picture: ip_to_string
        });

        firebase.database().ref('page_views').once('value').then(function (snapshot) {
            sessionStorage.setItem('fcs_page_views_count', snapshot.numChildren());
            //console.log(sessionStorage.getItem('fcs_page_views_count'));
            $('#fcsCounter').html(sessionStorage.getItem('fcs_page_views_count'));
            $('#fcsCounter').html('&nbsp;' + i18next.t('sidemenu.visitors') + "：" + sessionStorage.getItem('fcs_page_views_count'));
            //views = snapshot.numChildren();
        });
    }
}

function setNavCurrentLanguage(lang) {
    var selLang = i18next.t('lng.english');
    if (lang == 'fr') { selLang = i18next.t('lng.french'); }
    else if (lang == 'nl') { selLang = i18next.t('lng.dutch'); }
    else if (lang == 'el') { selLang = i18next.t('lng.greek'); }
    $('#fcsCurrentLng').html(selLang);
}

function checkLoginToken() {
    if (sessionStorage.getItem('accessToken') != null) {
        var t = sessionStorage.getItem('fcs_login_time') == null ? 0 : sessionStorage.getItem('fcs_login_time');
        var itvl = Math.abs(new Date().getTime() / 1000 - t);
        if (itvl > 1 * 60) {
            var url = 'https://api.floodcitisense.eu';
            $.ajax({
                url: url + '/connect/token',
                type: 'POST',
                beforeSend: function (request) {
                    //request.setRequestHeader('Abp.TenantId', '1').setRequestHeader('Content-Type', 'application/json');
                },
                data: {
                    'client_id': 'FloodCitiSense',
                    'refresh_token': sessionStorage.getItem('refreshToken'),
                    'grant_type': 'refresh_token'
                },
                contentType: 'application/x-www-form-urlencoded',
                dataType: 'json',

                success: function (r) {
                    sessionStorage.setItem('accessToken', r.access_token);
                    sessionStorage.setItem('refreshToken', r.refresh_token);
                    sessionStorage.setItem('fcs_login_time', new Date().getTime() / 1000);
                },

                error: function (xhr, ajaxOptions, thrownError) {
                    $('#loading_table').hide();
                    console.log(xhr.status);
                }
            });
        }
    }
}

function loginWithFCSAccount(account, pw) {
    $('#loading_table').show();
    var postData = new Object();
    postData.userNameOrEmailAddress = account;
    postData.password = pw;
    var url = 'https://api.floodcitisense.eu';
    $.ajax({
        url: url + '/api/TokenAuth/Authenticate',
        type: 'POST',
        beforeSend: function (request) {
            request.setRequestHeader('Abp.TenantId', '1').setRequestHeader('Content-Type', 'application/json');
        },
        data: JSON.stringify(postData),
        dataType: 'json',
        processData: false,
        contentType: 'application/json',

        success: function (r) {
            if (r.success) {
                sessionStorage.setItem('accessToken', r.result.accessToken);
                sessionStorage.setItem('refreshToken', r.result.refreshToken);
                sessionStorage.setItem('fcs_login_time', new Date().getTime() / 1000);
                getCurrentUserProfile();
            } else {
                $('#loading_table').hide();
                fcsAlert(r.error.message, r.error.details, 'warning');
            }
        },

        error: function (xhr, ajaxOptions, thrownError) {
            $('#loading_table').hide();
            fcsAlert('', i18next.t('login.failed'), 'warning');
            console.log(xhr.status);
        }
    });
}

function getCurrentUserProfile() {
    var url = 'https://api.floodcitisense.eu';
    $.ajax({
        url: url + '/api/services/app/Profile/GetCurrentUserProfileForEdit',
        type: "GET",
        beforeSend: function (request) {
            request.setRequestHeader('Authorization', 'Bearer ' + sessionStorage.getItem('accessToken'));
        },

        processData: false,
        contentType: 'application/json',

        success: function (r) {
            $('#loading_table').hide();
            if (r.success) {
                setUserData(r.result);

                fcsAlertOnAfterClose('', i18next.t('login.success'), 'success', function (e) {
                    window.location.href = "Default.html";
                });
            } else {
                fcsAlert(r.error.message, r.error.details, 'warning');
            }
        },

        error: function (xhr, ajaxOptions, thrownError) {
            $('#loading_table').hide();
            //fcsAlert('Login failed!', 'Invalid user name or password', 'warning')
            console.log(xhr.status);
        }
    });
}

function isEmpty(str) {
    return (!str || 0 === str.length);
}

function fcsAlert(tt, msg, tp) {
    try {
        Swal.fire({
            position: 'center',
            type: tp,
            title: tt,
            text: msg,
            showConfirmButton: false,
            timer: 3000,
            onClose: null,
            onAfterClose: null
        });
    }
    catch (ex) {
        //console.log(ex);
    }
}

function openAboutDlg() {
    $('#modalAbout').modal(); return false;
}

function fcsAlertOnAfterClose(tt, msg, tp, fucClose) {
    Swal.fire({
        position: 'center',
        type: tp,
        title: tt,
        text: msg,
        showConfirmButton: false,
        timer: 1500,
        onAfterClose: fucClose
        //onAfterClose: () => {
        //    alert('123');
        //}
    });
}

/**
        * Dynamic Create Nav Bar ,Check User Loin or not
        */
function initNav() {
    $('#fcsSideMenu').empty();
    $('#fcsSideMenu').append(
        $('<li>').append(
            $('<a>').attr('href', 'Default.html').append(
                $('<i>').attr('class', 'fa fa-map-marked')
            ).append(
                $('<p>').html('&nbsp;' + i18next.t('sidemenu.rainfallSensors'))
            )
        ).attr('id', 'fcsDefault')
    ).append(
        $('<li>').append(
            $('<a>').attr('href', 'Incident.html').append(
                $('<i>').attr('class', 'fa fa-cloud-rain')
            ).append(
                $('<p>').html('&nbsp;' + i18next.t('sidemenu.floodMenu1'))
            )
                .append(
                    $('<p>').html('&nbsp;' + i18next.t('sidemenu.floodMenu2')).attr('style', 'padding-left:46px;')
                )
        ).attr('id', 'fcsIncident')
    ).append(
        $('<li>').append(
            $('<a>').attr('href', 'EWS.html').append(
                $('<i>').attr('class', 'fa fa-water')
            ).append(
                $('<p>').html('&nbsp;' + i18next.t('sidemenu.ews'))
            )
        ).attr('id', 'fcsEWS')
    );
    var accessToken = sessionStorage.getItem('accessToken');
    $('#fcsNav').empty();

    //$('#fcsNav')
    //    .append(
    //        $('<li>').attr('class', 'nav-item dropdown')
    //            .append(
    //                $('<a>').attr('class', 'nav-link dropdown-toggle').attr('data-toggle', 'dropdown').attr('aria-haspopup', 'true').attr('aria-expanded', 'false').attr('id', 'navbarDropdownMenuLink')
    //                    .append(
    //                        $('<i>').attr('class', 'now-ui-icons location_world')
    //                    ).append(
    //                        $('<p>')
    //                            .append(
    //                                $('<span>').attr('class', 'd-lg-none d-md-block').html('&nbsp;Language')
    //                            )
    //                    )
    //            ).append(
    //                $('<div>').attr('class', 'navdropdown-menu dropdown-menu-right').attr('aria-labelledby', 'navbarDropdownMenuLink')
    //                    .append(
    //                        $('<a>').attr('class', 'dropdown-item').attr('href', '#').html('En')
    //                    ).append(
    //                        $('<a>').attr('class', 'dropdown-item').attr('href', '#').html('fl')
    //                    ).append(
    //                        $('<a>').attr('class', 'dropdown-item').attr('href', '#').html('ee')
    //                    )
    //            )
    //    );
    //console.log($('#fcsNav'));
    if (accessToken == null) {
        $('#FCSNavUser').addClass('d-none');
        $('#fcsNav').append(
            $('<li>').attr('class', 'nav-item').append(
                $('<a>').attr('class', 'nav-link').attr('href', 'Login.html').append(
                    $('<i>').attr('class', 'fas fa-sign-in-alt')
                ).append(
                    $('<p>').append(
                        $('<span>').attr('class', 'd-md-block').html('&nbsp;' + i18next.t('nav.login'))
                    )
                )
            )
        ).append(
            $('<li>').attr('class', 'nav-item').append(
                $('<a>').attr('class', 'nav-link').attr('href', 'Signup.html').append(
                    $('<i>').attr('class', 'fas fa-user-plus')
                ).append(
                    $('<p>').append(
                        $('<span>').attr('class', 'd-md-block').html('&nbsp;' + i18next.t('nav.signup'))
                    )
                )
            )
        );

        $('#fcsSideMenu').append(
            $('<li>').append(
                $('<a>').attr('href', '#').attr('onclick', 'openAboutDlg();return false;').append(
                    $('<i>').attr('class', 'fa fa-info-circle')
                ).append(
                    $('<p>').html('&nbsp;' + i18next.t('sidemenu.about'))
                )
            )
        ).append(
            $('<li>') //.attr('class', 'pull-right')
                .append(
                    $('<a>').attr('href', '#').attr('onclick', 'return false;').append(
                        $('<i>').attr('class', 'fa fa-user-md')
                    ).append(
                        $('<p>').html('&nbsp;0').attr('id', 'fcsCounter')
                    )
                )
        );
    } else {
        $('#FCSNavUser').removeClass('d-none');

        $('#fcsNav').append(
            $('<li>').attr('class', 'nav-item dropdown').append(
                $('<a>').attr('class', 'nav-link  dropdown-toggle').attr('href', '#')
                    .attr('id', 'navbarDropdownMenuLink').attr('data-toggle', 'dropdown')
                    .attr('aria-haspopup', 'true').attr('aria-expanded', 'false').append(
                        $('<i>').attr('class', 'now-ui-icons users_single-02')
                    ).append(
                        $('<p>').append(
                            $('<span>').attr('class', 'd-md-block').attr('id', 'fcsNavUserName').html('&nbsp;' + i18next.t('nav.account'))
                        )
                    )
            ).append(
                $('<div>').attr('class', 'dropdown-menu dropdown-menu-right')
                    .attr('aria-labelledby', 'navbarDropdownMenuLink').append(
                        $('<a>').attr('class', 'dropdown-item').attr('href', '#').append(
                            $('<i>').attr('class', 'fa fa-home').html('&nbsp;Home')
                        )
                    ).append(
                        $('<a>').attr('class', 'dropdown-item').attr('href', 'Profile.html').append(
                            $('<i>').attr('class', 'fa fa-user-edit').html('&nbsp;' + i18next.t('nav.editProfile'))
                        )
                    ).append(
                        $('<a>').attr('class', 'dropdown-item').attr('href', 'Pwd.html').append(
                            $('<i>').attr('class', 'fa fa-key').html('&nbsp;' + i18next.t('nav.resetPassword'))
                        )
                    ).append(
                        $('<div>').attr('class', 'dropdown-divider')
                    ).append(
                        $('<a>').attr('class', 'dropdown-item').attr('href', '#')
                            .attr('onclick', 'onUserLogout();return false;').append(
                                $('<i>').attr('class', 'fa fa-sign-out-alt').html('&nbsp;' + i18next.t('nav.logout'))
                            )
                    )
            )
        );

        $('#fcsNavUserName').html('&nbsp;' + (sessionStorage.getItem('fcs_userName') == null ? i18next.t('nav.account') : sessionStorage.getItem('fcs_userName')));

        //if have some permission
        $('#fcsSideMenu').append(
            $('<li>').append(
                $('<a>').attr('href', 'SMPN.html').append(
                    $('<i>').attr('class', 'fa fa-comment')
                ).append(
                    $('<p>').html('&nbsp;' + i18next.t('sidemenu.smpn'))
                )
            ).attr('id', 'fcsSMPN')
        );
        $('#fcsSideMenu').append(
            $('<li>').append(
                $('<a>').attr('href', '#').attr('onclick', 'openAboutDlg();return false;').append(
                    $('<i>').attr('class', 'fa fa-info-circle')
                ).append(
                    $('<p>').html('&nbsp;' + i18next.t('sidemenu.about'))
                )
            )
        ).append(
            $('<li>') //.attr('class', 'pull-right')
                .append(
                    $('<a>').attr('href', '#').attr('onclick', 'return false;').append(
                        $('<i>').attr('class', 'fa fa-user-md')
                    ).append(
                        $('<p>').html('&nbsp;0').attr('id', 'fcsCounter')
                    )
                )
        );
    }
}

function onUserLogout() {
    Swal.fire({
        title: i18next.t('nav.logout'),
        text: i18next.t('nav.areYouSure') + "?",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        //confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.value) {
            removeUserData();
            window.location.href = "Default.html";
        }
    });
}

function setUserData(ud) {
    sessionStorage.setItem('fcs_name', ud.name);
    sessionStorage.setItem('fcs_surname', ud.surname);
    sessionStorage.setItem('fcs_userName', ud.userName);
    sessionStorage.setItem('fcs_emailAddress', ud.emailAddress);
    sessionStorage.setItem('fcs_id', ud.id);
    sessionStorage.setItem('fcs_phoneNumber', ud.phoneNumber);
}

function removeUserData() {
    sessionStorage.removeItem('fcs_login_time');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('fcs_name');
    sessionStorage.removeItem('fcs_surname');
    sessionStorage.removeItem('fcs_userName');
    sessionStorage.removeItem('fcs_emailAddress');
    sessionStorage.removeItem('fcs_id');
    sessionStorage.removeItem('fcs_phoneNumber');
}