var url = 'http://yts.re/api/list.json?sort=seeds&limit=50';

var Yts = Backbone.Collection.extend({
    url: url,
    model: App.Model.Movie,

    initialize: function(models, options) {
        if (options.keywords) {
            this.url += '&keywords=' + options.keywords;
        }

        if (options.genre) {
            this.url += '&genre=' + options.genre;
        }

        if (options.page && options.page.match(/\d+/)) {
            this.url += '&set=' + options.page;
        }

        this.options = options;
        Yts.__super__.initialize.apply(this, arguments);
    },

    parse: function (data) {
        var movies = [],
            memory = {};

        if (data.error || typeof data.MovieList === 'undefined') {
            return movies;
        }

        data.MovieList.forEach(function (movie) {
            // No imdb, no movie.
            if( typeof movie.ImdbCode != 'string' || movie.ImdbCode.replace('tt', '') == '' ){ return; }

            var torrents = {};
            torrents[movie.Quality] = movie.TorrentUrl;

            // Temporary object
            var movieModel = {
                imdb:       movie.ImdbCode.replace('tt', ''),
                title:      movie.MovieTitleClean,
                year:       movie.MovieYear,
                runtime:    0,
                synopsis:   "",
                voteAverage:parseFloat(movie.MovieRating),

                image:      movie.CoverImage,
                bigImage:   movie.CoverImage.replace(/_med\./, '_large.'),
                backdrop:   "",

                quality:    movie.Quality,
                torrent:    movie.TorrentUrl,
                torrents:   torrents,
                videos:     {},
                subtitles:  {},
                seeders:    movie.TorrentSeeds,
                leechers:   movie.TorrentPeers,

                // YTS do not provide metadata and subtitle
                hasMetadata:false,
                hasSubtitle:false
            };

            var stored = memory[movieModel.imdb];

            // Create it on memory map if it doesn't exist.
            if (typeof stored === 'undefined') {
                stored = memory[movieModel.imdb] = movieModel;
            }

            if (stored.quality !== movieModel.quality && movieModel.quality === '720p') {
                stored.torrent = movieModel.torrent;
                stored.quality = '720p';
            }

            // Set it's correspondent quality torrent URL.
            stored.torrents[movie.Quality] = movie.TorrentUrl;

            // Push it if not currently on array.
            if (movies.indexOf(stored) === -1) {
                movies.push(stored);
            }
        });

        console.log('Torrents found:', data.MovieList.length);

        return movies;
    }
});

App.Scrapers.Yts = Yts;