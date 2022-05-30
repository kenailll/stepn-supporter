const axios = require('axios').default;
const totp = require("totp-generator");

async function login(loginUrl, account, private, headers, callback=null){
	let pattern = /&account=(.+)&password/;
	let url = loginUrl.replace(pattern, `&account=${account}&password`);
	console.log("newUrl", url)
	var login = await axios.get(url, headers);

	headers.cookie = login.headers['set-cookie'][0];

	try {
		console.log('login data', login.data)
		if(login.data.code == 0){
			await doCodeCheck(private, headers)
		}
	} catch (error) {
		console.log(error)
	}

	if(callback){
		callback(private, headers);
	}
}

async function logout(headers){
	let url = `https://apilb.stepn.com/run/loginOut`;

	let result = await axios.get(url, headers);
	console.log("2fa_data:", result.data)
	return result
}

async function doCodeCheck(private, headers){
	headers["user-agent"] = "Dart/2.16 (dart:io)"

	let gg_2fa = totp(private);
	let url = `https://apilb.stepn.com/run/doCodeCheck?codeData=2%3A${gg_2fa}`;

	let result = await axios.get(url, {headers: headers});
	console.log("2fa_data:", result.data)
	return result
}

async function userbasic(headers){
	headers["user-agent"] = "Dart/2.16 (dart:io)"
    let url = `https://apilb.stepn.com/run/userbasic`;
	var amount = 0;
	try {
		let result = await axios.get(url, {headers: headers});
		if(result.data.code == 0){
			let asset = result.data.data.asset.find(obj => obj.token == 1004);
			amount = asset.value;
		}
	} catch (error) {
		console.log('userbasic error', error)
	}

	return amount
}

async function withdraw(private, headers){
	headers["user-agent"] = "Dart/2.16 (dart:io)"
    var amount = await userbasic(headers);

    //let url = `https://apilb.stepn.com/run/withdrawtoken?chainID=104&dataID=1004&num=500&getTax=true`;
    //let result = await axios.get(url, {headers: headers});
    //console.log('withdraw tax', result.data);

    //if(result.data.code == 0 && amount > 0){
        let gg_2fa = totp(private);
        let url = `https://apilb.stepn.com/run/withdrawtoken?chainID=104&dataID=1004&num=${400}&googleCode=${gg_2fa}`;
        let result = await axios.get(url, {headers: headers});
        console.log("withdraw", result.data)
        return result
    //}

    return null
}
async function withdrawNFT(private, dataID, id, headers){
	headers["user-agent"] = "Dart/2.16 (dart:io)"
    //var amount = await userbasic(headers);
	let gg_2fa = totp(private);
	let url = `https://apilb.stepn.com/run/withdrawtoken?dataID=${dataID}&propID=${id}&chainID=104&num=1&googleCode=${gg_2fa}`;
	let result = await axios.get(url, {headers: headers});
	console.log("withdraw", result.data)
	return result

    return null
}

async function shoeList(private, headers){
	headers["user-agent"] = "Dart/2.16 (dart:io)"
    //var amount = await userbasic(headers);
	let gg_2fa = totp(private);
	let url = `https://apilb.stepn.com/run/shoelist`;
	let result = await axios.get(url, {headers: headers});
	console.log("withdraw", result.data)
	return result

    return null
}
module.exports = {login, logout, doCodeCheck, withdraw}