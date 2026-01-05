const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const crypto = require('crypto');

module.exports = (env, argv) => {
    const mode = argv.mode || 'development';
    const isProduction = mode === 'production';

    // Generate unique build ID on every build
    const buildId = crypto.randomUUID();
    const buildTime = new Date().toISOString();

    console.log('==========================================');
    console.log('Building Trapper Plugin');
    console.log(`Build ID: ${buildId}`);
    console.log(`Build Time: ${buildTime}`);
    console.log('==========================================');

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
            new webpack.DefinePlugin({
                '__BUILD_ID__': JSON.stringify(buildId),
                '__BUILD_TIME__': JSON.stringify(buildTime)
            }),
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
                    },
                    {
                        from: 'src/icons',
                        to: 'icons',
                        noErrorOnMissing: true
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