const axios = require('axios').default;
const totp = require("totp-generator");
const fs = require("fs")

const adb = require('./nox_adb')
const account_path = 'C:/Users/phonnn/Desktop/stepn-sniffer/accounts/'

class STEPN {
	constructor(){
		this.email = '';
		this.private = '';
		this.version1 = '';

		this.id = undefined;

		this.isLogin = false;
		this.firstTime = true;

		this.app = axios.create({
            baseURL: 'https://apilb.stepn.com/',
        });

		this.headers = {
			'user-agent': 'Dart/2.16 (dart:io)',
			'accept': 'application/json',
			'accept-language':	'zh-CN',
			'accept-encoding':'gzip',
			'cookie': '',
			'version1': '',
			'host': 'apilb.stepn.com'
		};
	}

	_init(_email, _private){
		this.email = _email;
		this.private = _private;
		this.isLogin = false;
		try {
			this.account_data = JSON.parse(fs.readFileSync(`${account_path}${this.email}.json`, 'utf-8'));
			this.headers.cookie = this.account_data.cookie;
		} catch (error) {
			this.account_data = {};
		}
	}

	async updateVersion1(){
		if(this.version1 == ''){
			await adb.noxVersion();
			this.headers.version1 = this.version1;
		}
	}

	async login(url){
		let headers = {
			'user-agent': 'Dart/2.16 (dart:io)',
			'accept': 'application/json',
			'accept-language':	'zh-CN',
			'accept-encoding':'gzip',
			'host': 'apilb.stepn.com'
		}

		try {
			var login = await this.app.get(url, headers);
			console.log(`${this.email} -- Login data --`, login.data)
		} catch (error) {
			console.log(`${this.email} -- Login error -- ${error}`)
			return {code : 1, msg : 'Login error'} 
		}

	
		if(login.data.code != 0){
			return login
		}
		
		let pattern = /deviceInfo=(.+)&{0,1}/
		let deviceInfo = url.match(pattern)[1].toString().replace('%40', '@');
		deviceInfo = encodeURI(deviceInfo);

		//save cookie
		this.account_data.cookie = login.headers['set-cookie'][0];
		this.account_data.deviceInfo = deviceInfo;
		this.headers.cookie = login.headers['set-cookie'][0];
		fs.writeFileSync(`${account_path}${this.email}.json`, JSON.stringify(this.account_data, '', 4));

		try {
			await this.doCodeCheck();

			let userInfo = await this.userbasic();
			this.saveUserbasic(userInfo);
			let shoesList = await this.shoesList();
			this.saveShoes(shoesList);
		} catch (error) {
			console.log(`${this.email} -- Login error -- ${error}`)
			return {code : 1, msg : 'Login error'}
		}

		return login
	}
	
	async doCodeCheck(){
		await this.updateVersion1();
		let gg_2fa = totp(this.private);

		let params = {
			codeData: `2:${gg_2fa}`
		};

		let result = await this.app.get('/run/doCodeCheck', {headers: this.headers, params: params});
		
		if(result.data.code != 0){
			this.isLogin = false;
		} else {
			this.isLogin = true;
		}

		console.log(`${this.email} -- 2fa_data --`, result.data)

		return result.data
	}

	async logout(){
		await this.updateVersion1();
		let result = await this.app.get('/run/loginOut', {headers: this.headers});
		
		this.isLogin = false;
		this.firstTime = true;

		console.log(`${this.email} -- Logout --`, result.data)

		return result.data
	}

	async userbasic(){
		await this.updateVersion1();
		var result = await this.app.get('/run/userbasic', {headers: this.headers});
		
		if(result.data.code == 102001){
			this.isLogin = false;
		}

		return result.data
	}

	async shoesList(){
		await this.updateVersion1();
		let result = await this.app.get('/run/shoelist', {headers: this.headers});

		if(result.data.code == 102001){
			this.isLogin = false;
		}

		return result.data
	}

	async withdraw(){
		await this.updateVersion1();
		let userbasic = await this.userbasic();
		let asset = userbasic.data.asset.find(obj => obj.token == 3000 && obj.chain == 104);
		if(asset.value > 0){
			let gg_2fa = totp(this.private);
			let params = {
				'chainID': 104,
				'dataID': 3000,
				'num': asset.value,
				'googleCode': gg_2fa
			}
			let result = await this.app.get('/run/withdrawtoken', {headers: this.headers, params: params});

			if(result.data.code == 102001){
				this.isLogin = false;
			}

			console.log(`${this.email} -- Withdraw --`, result.data)

			return result.data
		}
	}
	async withdrawNFT(dataID, propID, chainID){
		await this.updateVersion1();
		let gg_2fa = totp(this.private);
		let params = {
			'dataID': dataID,
			'propID': propID,
			'chainID': chainID,
			'num': 1,
			'googleCode': gg_2fa
		}
		let result = await this.app.get('/run/withdrawtoken', {headers: this.headers, params: params});
		
		if(result.data.code == 102001){
			this.isLogin = false;
		}

		console.log(`${this.email} -- WithdrawNFT --`, result.data)

		return result.data
	}

	saveUserbasic(data){
		if(data.code == 0){
			this.account_data.userbasic = data.data;
			fs.writeFileSync(`${account_path}${this.email}.json`, JSON.stringify(this.account_data, '', 4));
		}
	}

	saveShoes(data){
		if(data.code == 0){
			let chain_103 = data.data.filter(shoe => shoe.chain == 103);
			let chain_104 = data.data.filter(shoe => shoe.chain == 104);
	
			this.account_data["103"] = chain_103
			this.account_data["104"] = chain_104

			fs.writeFileSync(`${account_path}${this.email}.json`, JSON.stringify(this.account_data, '', 4));
		}
	}

	async withdrawNFTs(){
		var shoes = {}
		var result = {code: 0, data: []}
		try {
			shoes = JSON.parse(fs.readFileSync(`${account_path}${this,this.email}_rut.json`, 'utf-8'));
		} catch (error) {
			return
		}
	
		for(let chainId of Object.keys(shoes)){
			for(let shoe of shoes[chainId]){
				let res = await this.withdrawNFT(shoe.dataID, shoe.id, chainId);

				if(res.code == 102001){
					result.code = 102001;
					return result
				}

				res.dataID = shoe.dataID;
				res.shoeID = shoe.id;
				result.data.push(res)
			}
		}
	
		//update shoelist in cache
		let new_shoesList = await this.shoesList();
		this.saveShoes(new_shoesList);
		return result
	}
}

module.exports = { STEPN }