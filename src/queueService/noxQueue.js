"use strict";
var Queue = require('bull');
const noxQueue = new Queue('ProcessNox');
const adb = require('./../nox_adb');
require("../config/")


noxQueue.process(1, async (job, done) => {
	const data = job.data;
	try {
		if (stepn_apis[data.id].email == data.email && !stepn_apis[data.id].isLogin) {
			await adb.noxLogin(data.email, data.password);
			inQueue[data.email] = undefined;
		}
		await utils.sleep(5000);
		done();
	} catch (error) {
		done(error);
	}
});


module.exports = noxQueue;