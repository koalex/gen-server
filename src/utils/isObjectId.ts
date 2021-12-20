export default function isObjectId(val: string) {
	return new RegExp('^[0-9a-fA-F]{24}$').test(val);
}
