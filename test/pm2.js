let i = 0
let test = {
    async sleep(time) {
        return new Promise((resolve) => {
            setTimeout(resolve, time)
        })
    },
    async run() {
        while (true) {
            console.log('run..' + i)
            await this.sleep(3000)
            i++
            if (i % 5 === 0) {
                var target = require('path').resolve(__dirname, `./restart.json`)
                console.log('save to..', i, target)
                require('fs').writeFileSync(target, JSON.stringify({ count: i }, null, 2))
            }
        }

    }
}
test.run()