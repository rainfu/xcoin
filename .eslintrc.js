module.exports = {
    "env": {
        "es6": true,
        "node": true,
        "jasmine": true,
        "browser": true
    },
    "extends": "eslint:recommended",
    "rules": {
        // allow paren-less arrow functions
        'arrow-parens': ["error", "as-needed"],
        // allow async-await
        'generator-star-spacing': 0,
        "space-before-function-paren": 0,
        // allow console
        'no-console': 0,
        // allow debugger during development
        'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
        semi: [
            2, 'never'
        ]
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        sourceType: 'module',
        parser: 'babel-eslint'
    }
}