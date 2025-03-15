import path from 'path'; // Node.js path module for resolving file paths - latest
import { CracoConfig } from '@craco/craco'; // Type definition for CRACO configuration - ^7.1.0
import CracoLessPlugin from 'craco-less'; // CRACO plugin for Less CSS preprocessor support - ^2.0.0
import CircularDependencyPlugin from 'circular-dependency-plugin'; // Webpack plugin to detect circular dependencies - ^5.2.2
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'; // Webpack plugin for visualizing bundle size - ^4.8.0

// Check if bundle analysis is enabled via environment variable
const isAnalyzeMode = process.env.ANALYZE === 'true';

const cracoConfig: CracoConfig = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@state': path.resolve(__dirname, 'src/state'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@features': path.resolve(__dirname, 'src/features'),
    },
    plugins: [
      // Detect circular dependencies to improve code quality
      new CircularDependencyPlugin({
        exclude: /node_modules/,
        include: /src/,
        failOnError: false, // We don't want to fail the build, just warn
        allowAsyncCycles: false,
        cwd: process.cwd(),
      }),
      // Conditionally add bundle analyzer plugin when in analyze mode
      ...(isAnalyzeMode ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: true,
        })
      ] : []),
    ],
    configure: (webpackConfig) => {
      // Improve split chunks for better caching and performance
      if (webpackConfig.optimization) {
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          name: false,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        };

        // Ensure minimizer is enabled for production to reduce bundle size
        if (process.env.NODE_ENV === 'production') {
          webpackConfig.optimization.minimize = true;
          webpackConfig.optimization.concatenateModules = true;
        }
      }

      return webpackConfig;
    },
  },
  babel: {
    presets: [], // Use CRA's default presets
    plugins: [
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      '@babel/plugin-proposal-class-properties',
    ],
  },
  jest: {
    configure: {
      // Path aliases for test files to match webpack alias configuration
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@pages/(.*)$': '<rootDir>/src/pages/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@styles/(.*)$': '<rootDir>/src/styles/$1',
        '^@api/(.*)$': '<rootDir>/src/api/$1',
        '^@state/(.*)$': '<rootDir>/src/state/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
        '^@constants/(.*)$': '<rootDir>/src/constants/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@assets/(.*)$': '<rootDir>/src/assets/$1',
        '^@features/(.*)$': '<rootDir>/src/features/$1',
      },
      setupFilesAfterEnv: [
        '<rootDir>/src/setupTests.ts',
      ],
      // Files to collect coverage from, excluding non-testable files
      collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/index.tsx',
        '!src/serviceWorker.ts',
        '!src/reportWebVitals.ts',
      ],
      // Minimum coverage thresholds to ensure good test coverage
      coverageThreshold: {
        global: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
  },
  eslint: {
    enable: true,
    mode: 'extends',
    configure: {
      extends: [
        'react-app',
        'react-app/jest',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
      ],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'prettier/prettier': ['error', { singleQuote: true }],
      },
      ignorePatterns: ['build/', 'node_modules/', 'public/'],
    },
  },
  plugins: [
    // Enable Less CSS preprocessor support
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true, // Enable JavaScript in Less for theme customization
          },
        },
      },
    },
  ],
  devServer: {
    port: 3000,
    proxy: {
      // Proxy API requests to backend during development
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
    historyApiFallback: true, // Support for HTML5 history API for SPA routing
    hot: true, // Enable hot module replacement
    open: true, // Open browser on server start
  },
};

export default cracoConfig;