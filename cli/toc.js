var request = require('request');
var async = require('async');
var _ = require('lodash')._;
var getEpisodeUrl = require('../lib/urls').getEpisodeUrl;

module.exports = function(config) {
    var api = {};

    function getPackageJSON(repo, cb) {
        var episodeUrl = getEpisodeUrl(repo.owner.login, repo.name);
        request(optionsFromUrl(episodeUrl), function(err, response, body) {
            if (err) return cb(err);
            if (response.statusCode !== 200) {
                return cb(new Error('problem downloading ' + episodeUrl));
            }
            var data = null;
            try {
                json = body.match(/PKGJSON=(.*)\/\*PKGJSON/)[1];
                data = JSON.parse(json);
            } catch(e) {
                return cb(e);
            }
            var ret = {
                repo: repo,
                pkg: data
            };
            cb(null, ret);
        });
    }

    function optionsFromUrl(url) {
        return {
            url: url,
            headers: {
                'User-Agent': config.github_user
            }
        };
    }

    api.toc = function(cb) {
        api.listRepos(function(err, repos) {
            if (err) return cb(err);
            async.map(repos, getPackageJSON, cb); 
        });
    };

    api.listRepos = function(cb) {
        var listReposUrl = "https://api.github.com/orgs/"+ config.github_organisation +"/repos?type=public";
        var options = optionsFromUrl(listReposUrl);
        request(options, function(err, response, data) {
            if (err) return cb(err);
            if (response.statusCode !== 200) {
                cb(new Error(data));
            }
            var repos = null;
            try {
                repos = JSON.parse(data);
            } catch(e) {
                console.log(data);
                return cb(e);
            }
            // reject organisation's repo
            repos = _.reject(repos, function(r) {
                return r.name === r.owner.login;
            }); 
            /*
            var repos = _(repos).map(function(r) {
                return {
                    owner: r.owner.login,
                    name: r.name,
                    updated_at: r.updated_at,
                    url: r.ssh_url
                };
            }).value();
            */
            cb(null, repos);
        });
    };
    return api;
};
