const checkVersion = (message, cb) => {
    let versionObj = require('../../../../data/panacea/version.json')
    function versionCompare(oldVer, newVer) {
        let v1s = oldVer.split('.')
        let v2s = newVer.split('.')
        let oldV = 10000 * v1s[0] + 100 * v1s[1] + parseInt(v1s[2])
        let newV = 10000 * v2s[0] + 100 * v2s[1] + parseInt(v2s[2])
        return newV > oldV
    }
    let hasNewVersion = versionCompare(message.data.version, versionObj.version)
    if (!hasNewVersion) return
    let data = {
        action: message.action,
        data: versionObj
    }
    if (cb) cb(data)
}
module.exports = {
    checkVersion
}