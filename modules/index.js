const { readdirSync } = require('fs')
const path = require('path')

function getModules () {	
  const modules = readdirSync(__dirname, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map((dirent) => {
      return require('./'+dirent.name)
    })
  return modules
}

const _m = {
	modules: getModules()
}

console.log(_m)

module.exports = _m