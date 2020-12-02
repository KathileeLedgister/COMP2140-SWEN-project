/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("#app-install").css("display", "block");
});
_pw_handler = function () {
    $("#app-install").css("display", "none");
    deferredPrompt.prompt();
};
