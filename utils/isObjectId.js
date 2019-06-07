module.exports = function (val) {
	return new RegExp('^[0-9a-fA-F]{24}$').test(val);
};
