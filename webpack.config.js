const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    const mode = argv.mode || 'development';
    const isProduction = mode === 'production';

    return {
        mode: mode,
        entry: './src/index.js',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'index.js',
            clean: true
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                            plugins: []
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                }
            ]
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    {
                        from: 'manifest.json',
                        to: 'manifest.json',
                        transform(content) {
                            // Ensure main path is correct for dist folder
                            const manifest = JSON.parse(content);
                            manifest.main = 'index.html';
                            return JSON.stringify(manifest, null, 2);
                        }
                    },
                    {
                        from: 'assets',
                        to: '',
                        noErrorOnMissing: true
                    },
                    {
                        from: 'src/index.html',
                        to: 'index.html'
                    }
                ]
            })
        ],
        resolve: {
            extensions: ['.js', '.json'],
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        },
        externals: {
            photoshop: 'commonjs2 photoshop',
            uxp: 'commonjs2 uxp'
        },
        target: 'web',
        devtool: isProduction ? false : 'source-map',
        optimization: {
            minimize: isProduction
        }
    };
};