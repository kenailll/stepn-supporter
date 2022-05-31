const axios = require('axios').default;
const totp = require("totp-generator");
const fs = require("fs")

//login with url and private
async function login(url, private, headers, callback=null){
	let pattern = /&account=(.+)&password/;
	let account = url.match(pattern)[1].toString().replace('%40', '@');
	var login = await axios.get(url, headers);
	console.log('login data', login.data)

	var account_data = {}
	try {
		account_data = JSON.parse(fs.readFileSync(`./accounts/${account}.json`, 'utf-8'));
	} catch (error) {
	}

	if(login.data.code != 0){
		console.log('Login error', login.data.msg);
		return login
	}

	account_data.cookie = login.headers['set-cookie'][0];
	headers.cookie = login.headers['set-cookie'][0];
	login.data.cookie = login.headers['set-cookie'][0];

	try {
		await doCodeCheck(private, headers)

		let user_info = await userbasic(headers);
		if(user_info.code == 0){
			account_data.userbasic = user_info.data;
		}		
	} catch (error) {
		console.log('Login error', error)
		return login
	}

	if(callback){
		callback(account, private, headers)
	}

	fs.writeFileSync(`./accounts/${account}.json`, JSON.stringify(account_data, '', 4));
	return login
}

async function logout(headers){
	let url = `https://apilb.stepn.com/run/loginOut`;

	let result = await axios.get(url, headers);
	console.log("logout:", result.data)
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
	var result = await axios.get(url, {headers: headers});
	return result.data
}

function saveUserbasic(account, data){
	if(data.code == 0){
		var account_data = {}
	
		try {
			account_data = JSON.parse(fs.readFileSync(`./accounts/${account}.json`, 'utf-8'));
		} catch (error) {
			console.log(error)
		}

		account_data.userbasic = data.data;
		fs.writeFileSync(`./accounts/${account}.json`, JSON.stringify(account_data, '', 4));
	}
}

async function withdraw(private, headers){
	headers["user-agent"] = "Dart/2.16 (dart:io)"
    let userbasic = await userbasic(headers);
	let asset = result.data.data.asset.find(obj => obj.token == 1004);
	var result = {}
    if(asset.value > 0){
        let gg_2fa = totp(private);
        let url = `https://apilb.stepn.com/run/withdrawtoken?chainID=104&dataID=1004&num=${asset.value}&googleCode=${gg_2fa}`;
        let result = await axios.get(url, {headers: headers});
        console.log("withdraw", result.data)
    }

	return result
}

async function withdrawNFT(private, dataID, propID, chainID, headers){
	headers["user-agent"] = "Dart/2.16 (dart:io)"
	let gg_2fa = totp(private);
	let url = `https://apilb.stepn.com/run/withdrawtoken?dataID=${dataID}&propID=${propID}&chainID=${chainID}&num=1&googleCode=${gg_2fa}`;
	let result = await axios.get(url, {headers: headers});
	console.log("withdraw", result.data)
	return result
}

async function shoesList(headers){
	headers["user-agent"] = "Dart/2.16 (dart:io)"
	let url = `https://apilb.stepn.com/run/shoelist`;
	let result = await axios.get(url, {headers: headers});
	return result.data
}

function saveShoes(account, data){
	if(data.code == 0){
		var account_data = {}

		try {
			account_data = JSON.parse(fs.readFileSync(`./accounts/${account}.json`, 'utf-8'));
		} catch (error) {
			console.log(error)
		}

		let chain_103 = data.data.filter(shoe => shoe.chain == 103);
		let chain_104 = data.data.filter(shoe => shoe.chain == 104);

		account_data["103"] = chain_103
		account_data["104"] = chain_104
		fs.writeFileSync(`./accounts/${account}.json`, JSON.stringify(account_data, '', 4));
	}
}

async function withdrawNFTs(account, private, headers){
	var shoes = {}
	
	try {
		shoes = JSON.parse(fs.readFileSync(`./accounts/${account}_rut.json`, 'utf-8'));
	} catch (error) {
		console.log(error)
		return
	}

	for(let chainId of Object.keys(shoes)){
		for(let shoe of shoes[chainId]){
			await withdrawNFT(private, shoe.dataID, shoe.id, chainId, headers);
		}
	}

	//update shoelist in cache
	let new_shoesList = await shoesList(headers);
	console.log("new_shoesList", new_shoesList)
	saveShoes(account, new_shoesList);
}

module.exports = { login, logout, doCodeCheck, withdraw, userbasic, saveUserbasic, shoesList, saveShoes, withdrawNFTs}