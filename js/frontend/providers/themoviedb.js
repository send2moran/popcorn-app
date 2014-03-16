// Fix for https://github.com/visionmedia/superagent/issues/95
var mdb = require('moviedb')(vendorAPIs.themoviedb.key),
    POSTER_PREFIX = 'http://image.tmdb.org/t/p/w342/',
    BACKDROP_PREFIX = 'http://image.tmdb.org/t/p/original/',
    last = +new Date();

// Overriding moviedb movieInfo function to retrieve trailer information
mdb.movieInfo = function(params, fn){
  var request = require('moviedb/node_modules/superagent');
  params = params || {};
  endpoint = 'movie/:id';
  endpoint = endpoint.replace(':id', params.id);
  base_url = "https://api.themoviedb.org/3/";
  api_key = vendorAPIs.themoviedb.key;
  
  var req = request.get(base_url + endpoint)
            .query({api_key : api_key, append_to_response : "trailers"})
            .set('Accept', 'application/json')
            .end(function(res){
            if(res.ok) fn(null, res.body);
            else if(res.body && res.body.status_message) fn(new Error(res.body.status_message), null);
            else fn(new Error(res.text), null);
            });
};

var findMovieInfo = function (imdbId, callback) {
    var doRequest = function () {
        // 1 sec because limit is 3 calls every second, and we need to use 2.
        if (last > +new Date() - 1000) {
            return setTimeout(function () {
                findMovieInfo(imdbId, callback);
            }, new Date() - last + 1000);
        }

        last = +new Date();

        var findInfo = function (id, language) {
            mdb.movieInfo({
                id: id, language: language || i18n.getLocale()
            }, function (err, data) {
                if (!err && data) {
                    if (data.overview === null || data.runtime === null) {
                        default_movie = findInfo(id, "en")
                        ["overview", "runtime"].each(function(key){
                            if (data[key] === null) {
                                data[key] = default_movie[key]
                            }
                        });
                    }

                    if(!data.trailers.youtube[0]===null){
                        var youtubeTrailer = null;
                        console.log("trailer not found");
                    }else{
                        var youtubeTrailer = data.trailers.youtube[0].source;
                        console.log("found trailer:"+youtubeTrailer);
                    }

                    var info = {
                        image:       POSTER_PREFIX + data.poster_path,
                        backdrop:    BACKDROP_PREFIX + data.backdrop_path,
                        overview:    data.overview,
                        title:       data.title,
                        voteAverage: data.vote_average,
                        runtime:     data.runtime,
                        trailer:     youtubeTrailer,
                    };

                    console.log('Fetched info for', imdbId, ':', info);

                    // Save to cache
                    App.Cache.setItem('tmdb', imdbId, info);

                    // Return callback call
                    callback(info);
                }
            });
        };

        // Find internal tMDB ID
        mdb.find({
            id: 'tt' + imdbId,
            external_source: 'imdb_id', language: i18n.getLocale()
        }, function (err, data) {
            if (data && data.movie_results && data.movie_results.length) {
                findInfo(data.movie_results[0].id);
            }
        });
    };

    App.Cache.getItem('tmdb', imdbId, function (cachedItem) {
        if (cachedItem) {
            callback(cachedItem);
        } else {
            doRequest();
        }
    });
};

var MdbProvider = {
    fetch: function(model) {
        var imdbId = model.get('imdb');
        findMovieInfo(imdbId, function(info){
            model.set({
                title:      info.title,
                voteAverage:info.voteAverage,
                synopsis:   info.overview,
                runtime:    info.runtime,

                image:      info.image,
                bigImage:   info.image,
                backdrop:   info.backdrop,
                trailer:    info.trailer,
            });
            model.set('hasMetadata', true);
        });
    }
};

App.Providers.metadata = MdbProvider;
