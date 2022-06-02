
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)
const process = require('process');

process.chdir('D:/Program Files/Nox/bin');


async function getDevices(){
    let cmd_res = await exec("adb.exe devices");
    let devices = cmd_res.stdout.split('\r\n').slice(1, -2);
    devices = devices.map(obj => {
        return obj.split('\t')[0];
    })
    return devices
}

async function clearInput(X1, Y1, X2, Y2, device) {
    //select all text event
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 1 330 1`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 3 53 ${X1}`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 3 54 ${Y1}`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 0 2 0`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 0 0 0`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 3 53 ${X2}`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 3 54 ${Y2}`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 0 2 0`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 0 0 0`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 1 330 0`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 0 2 0`);
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell sendevent /dev/input/event4 0 0 0`);
    //delete text
    await exec(`adb.exe ${device? `-s ${device} `: ''}shell input keyevent 67`);
}

async function noxLogin(email, password, device=null){
    let main_screen = `adb.exe ${device? `-s ${device} `: ''}shell input tap 100 100"`;
    let email_input_command = `adb.exe ${device? `-s ${device} `: ''}shell input text "${email}"`;
    let password_input_command = `adb.exe ${device? `-s ${device} `: ''}shell input text "${password}"`;
    let login_tap_command = `adb.exe ${device? `-s ${device} `: ''}shell input tap 360 910`;
    // let mode_change_command = `adb.exe ${device? `-s ${device} `: ''}shell input tap 360 980`;
    await exec(main_screen);

    await clearInput(110, 610, 615, 610);
    await exec(email_input_command);

    await clearInput(110, 745, 615, 745);
    await exec(password_input_command);

    await exec(login_tap_command);

    return 1
}

async function noxVersion(device=null){
    clearInput();
    let login_tap_command = `adb.exe ${device? `-s ${device} `: ''}shell input tap 360 910`;

    await exec(login_tap_command);
}

module.exports = { clearInput, getDevices, noxLogin, noxVersion }
