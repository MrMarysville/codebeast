module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Find and remove the GenerateSW plugin (Workbox)
      if (webpackConfig.plugins) {
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return plugin.constructor.name !== 'GenerateSW' && 
                 plugin.constructor.name !== 'InjectManifest' &&
                 plugin.constructor.name !== 'WorkboxWebpackPlugin.GenerateSW' &&
                 plugin.constructor.name !== 'WorkboxWebpackPlugin.InjectManifest';
        });
      }
      return webpackConfig;
    },
  },
};
