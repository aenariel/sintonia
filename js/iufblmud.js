var gid = '220893197949915';
var now = new Date();
var date = new Date(now.getFullYear(), now.getMonth(), 1);
var search_text = '';
var playlist = new Playlist();
var feed = new Feed();
var player = null;

$(document).ready(function () {
    $('input').attr('autocomplete', 'off');

    $('#opt-fb-group-1').click(function () {
        changeGroup($("#btn-fb-group-1"), '220893197949915', 'Sintonia sobre Pretexto');
    });
    $('#btn-fb-group-1').click(function () {
        changeGroup($(this), '220893197949915', 'Sintonia sobre Pretexto');
    });

    var data_date =  (date.getMonth() + 1) + '-' + date.getFullYear();
    $('.btn-date-picker').attr('data-date', data_date);
    $('.btn-date-picker').html('<i class="icon-calendar"></i> ' + data_date);
    $('.btn-date-picker').datepicker().on('changeDate', function (e) {
        changeDate(e.date);
    });

    $('#options').on('hidden', function () {
        playlist.auto_advance = $('#play-mode').prop('checked');
        var sort_by = $('#sort-by-group input:radio:checked').val();
        var sort_dir = $('#sort-dir-group input:radio:checked').val();
        if (sort_by != feed.sort_by || sort_dir != feed.sort_dir) {
            feed.sort_by = sort_by;
            feed.sort_dir = sort_dir;
            feed.sort();
            feed.render();
            feed.events();
        }
    });

    $('#search-desktop').keyup(function () {
        changeSearch($(this).val(), $('#search-tablet'), $('#search-phone'));
    });
    $('#search-tablet').keyup(function () {
        changeSearch($(this).val(), $('#search-desktop'), $('#search-phone'));
    });
    $('#search-phone').keyup(function () {
        changeSearch($(this).val(), $('#search-desktop'), $('#search-tablet'));
    });
});

function changeGroup(btn, new_gid, name) {
    $('#fb-group').modal('hide');
    if (new_gid == gid) {
        return;
    }

    $('.btn-fb-group').html(name + '  <span class="caret"></span>');

    gid = new_gid;
    feed.refresh();

    $("#btn-fb-group-1").removeClass("btn-primary");
    $("#btn-fb-group-2").removeClass("btn-primary");
    $("#btn-fb-group-3").removeClass("btn-primary");
    $("#btn-fb-group-4").removeClass("btn-primary");
    btn.addClass("btn-primary");
}

function changeDate(new_date) {
    $('.btn-date-picker').datepicker('hide');
    if (date == new_date) {
        return;
    }

    $('.btn-date-picker').html('<i class="icon-calendar"></i> ' + (new_date.getMonth() + 1) + '-' + new_date.getFullYear());

    date = new_date;
    feed.refresh();
}

function changeSearch(text, dst1, dst2) {
    search_text = text.toLowerCase();
    dst1.val(text);
    dst2.val(text);
    feed.render();
    feed.events();
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        events: {
            'onReady': playlist.onPlayerReady,
            'onStateChange': playlist.onPlayerStateChange
        }
    });
}

window.fbAsyncInit = function () {
    FB.init({
        appId: '301159986660698',
        channelUrl: '//aenariel.no-ip.org/channel.html',
        status: true,
        cookie: true,
        xfbml: true
    });

    FB.getLoginStatus(function (response) {
        if (response.status === 'connected') {
            feed.accessToken = response.authResponse.accessToken;
            feed.refresh();
        } else {
            // FB.login(function (response) {
            //     if (response.authResponse) {
            //         feed.accessToken = response.authResponse.accessToken;
            //         feed.refresh();
            //     }
            // }, { scope: 'read_stream' });
            window.location = "https://www.facebook.com/dialog/oauth/?client_id=301159986660698&redirect_uri=http://aenariel.github.io/sintonia/default.htm&scope=read_stream";
        }
    });
};

function Playlist() {
    this.auto_advance = false;
    this.curr_post = null;
}

Playlist.prototype.onPlayerReady = function (event) {
    if (playlist.curr_post == null || playlist.curr_post.link == null) {
        return;
    }

    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11,11}).*/;
    match = playlist.curr_post.link.match(regExp);
    if (match && match.length >= 2) {
        player.cueVideoById(match[2]);
        event.target.playVideo();
    }
}

Playlist.prototype.onPlayerStateChange = function (event) {
    var curr_post = playlist.curr_post;
    if (event.data != YT.PlayerState.ENDED || curr_post == null || !playlist.auto_advance) {
        return;
    }

    $('#player-container-' + curr_post.id).collapse('hide');

    var curr_index = -1;
    for (i = 0; i < feed.posts.length; i++) {
        if (curr_post == feed.posts[i]) {
            curr_index = i;
            break;
        }
    }

    if (curr_index == -1 || curr_index == feed.posts.length - 1) {
        return;
    }

    for (i = curr_index + 1; i < feed.posts.length; i++) {
        if (feed.posts[i].link != null && feed.posts[i].link.indexOf('youtu') != -1) {
            $('#player-container-' + feed.posts[i].id).collapse('show');
            break;
        }
    }
}

function Feed() {
    this.accessToken = null;
    this.sort_by = 'time';
    this.sort_dir = 'desc';
    this.posts = [];
}

Feed.prototype.refresh = function () {
    playlist.curr_post = null;
    $('#player').appendTo('#player-hidden');

    feed.posts = [];
    $('#posts').empty();
    $('#loading').show();

    FB.api('/'+ gid +'/feed', { 
        access_token: feed.accessToken,
        limit: 1000,
        since: date.valueOf()/1000,
        until: (date.valueOf() + 86400000*31)/1000
    }, function (response) {
        if (response.data == null) {
            return;
        }

        $.each(response.data, function (i, v) {
            feed.posts[i] = new Post();
            feed.posts[i].init(v);
        });

        feed.sort();
        feed.render();
        feed.events();

        $('#loading').hide();
    });
};

Feed.prototype.sort = function () {
    switch(feed.sort_by ) {
    case 'time':
        if (feed.sort_dir == 'asc') {
            this.posts.sort(function (x, y) { return x.created_time - y.created_time; });
        } else {
            this.posts.sort(function (x, y) { return y.created_time - x.created_time; });
        }
      break;
    case 'author':
        if (feed.sort_dir == 'asc') {
            this.posts.sort(function (x, y) { return x.from.name.toLowerCase().localeCompare(y.from.name.toLowerCase()); });
        } else {
            this.posts.sort(function (x, y) { return y.from.name.toLowerCase().localeCompare(x.from.name.toLowerCase()); });
        }
      break;
    case 'post':
        if (feed.sort_dir == 'asc') {
            this.posts.sort(function (x, y) {
                var x = x.name;
                var y = y.name;
                if (x == null) {
                    x = 'post';
                }
                if (y == null) {
                    y = 'post';
                }
                return x.toLowerCase().localeCompare(y.toLowerCase());
            });
        } else {
            this.posts.sort(function (x, y) {
                var x = x.name;
                var y = y.name;
                if (x == null) {
                    x = 'post';
                }
                if (y == null) {
                    y = 'post';
                }
                return y.toLowerCase().localeCompare(x.toLowerCase());
            });
        }
      break;
    case 'likes':
        if (feed.sort_dir == 'asc') {
            this.posts.sort(function (x, y) { return x.likes - y.likes; });
        } else {
            this.posts.sort(function (x, y) { return y.likes - x.likes; });
        }
      break;
    case 'comments':
        if (feed.sort_dir == 'asc') {
            this.posts.sort(function (x, y) { return x.comments - y.comments; });
        } else {
            this.posts.sort(function (x, y) { return y.comments - x.comments; });
        }
      break;
    }
};

Feed.prototype.render = function () {
    playlist.curr_post = null;
    $('#player').appendTo('#player-hidden');

    var container = $('#posts');
    container.empty();
    var content = '';
    $.each(this.posts,
        function (i, post) {
            if (search_text == null ||
                search_text == '' ||
                (post.from != null && post.from.name != null && post.from.name.toLowerCase().indexOf(search_text) != -1) ||
                (post.message != null && post.message.toLowerCase().indexOf(search_text) != -1) ||
                (post.name != null && post.name.toLowerCase().indexOf(search_text) != -1)) {

                if (post.created_time > date) {
                    content += post.toHtml();
                }
            }
        }
    );
    container.html(content);
};

Feed.prototype.events = function () {
    $.each(this.posts, function (i, post) {
        if (post.link == null) {
            return;
        }

        var panel = $('#player-container-' + post.id);
        var anchor = $('#player-anchor-' + post.id);

        panel.on('show', function () {
            anchor.html('Hide Video');

            if (playlist.curr_post != null) {
                $('#player-container-' + playlist.curr_post.id).collapse('hide');
            }

            playlist.curr_post = post;
            $('#player').appendTo('#player-container-' + post.id);
        });

        panel.on('hide', function () {
            anchor.html('View Video');

            player.stopVideo();
            playlist.curr_post = null;
            $('#player').appendTo('#player-hidden');
        });
    });

    $(".player-anchor").hover(function () {
        $(this).css("cursor", "pointer");
    }, function () {
        $(this).css("cursor", "default");
    });
};

function Post() {
    this.id = null;
    this.from = null;
    this.message = null;
    this.name = null;
    this.link = null;
    this.likes = 0;
    this.comments = 0;
    this.created_time = null;
}

Post.prototype.init = function (data) {
    this.id = data.id != undefined ? data.id : null;
    this.message = data.message != undefined ? data.message : null;
    this.name = data.name != undefined ? data.name : null;
    this.created_time = data.created_time != undefined ? moment(data.created_time) : null;
    this.likes = (data.likes != undefined && data.likes.count != undefined) ? data.likes.count : 0;
    this.comments = (data.comments != undefined && data.comments.count != undefined) ? data.comments.count : 0;

    if (data.from != undefined) {
        this.from = new User();
        this.from.init(data.from);
    }

    if (data.link != undefined) {
        this.link = data.link;
    } else if (data.source != undefined) {
        this.link = data.source;
    }
};

Post.prototype.toHtml = function () {
    var v = ''
    if (this.link != null && this.link.indexOf("youtu") == -1) {
        v = '<i class="icon-play-circle"></i>&nbsp;' +
            '<a class="player-anchor" href="' + this.link + '">Link</a>';
    } else if (this.link != null) {
        v = '<i class="icon-play-circle"></i>&nbsp;' +
            '<a id="player-anchor-' + this.id + '" class="player-anchor" data-toggle="collapse" data-target="#player-container-' + this.id + '">View video</a>'
    }

    var res =
        '<div class="post">' +
            '<a href="http://www.facebook.com/profile.php?id=' + this.from.id + '">' +
                '<img class="post-img img-rounded" src="https://graph.facebook.com/' + this.from.id + '/picture">' +
            '</a>' +
            '<div class="post-details">' +
                '<small class="post-time">' + this.created_time.format("YYYY MMM DD HH:mm:ss") + '</small>' +
                '<p class="post-from">' +
                    '<a href="http://www.facebook.com/profile.php?id=' + this.from.id + '">' + this.from.name + '</a>' +
                '</p>' +
                '<p class="post-message">' + this.message + '</p>' +
                '<p class="post-name">' +
                    '<a href="https://www.facebook.com/' + this.id.replace("_", "/posts/") + '">' + (this.name == null ? 'Post' : this.name) + '</a>' +
                '</p>' +
                '<p class="post-footer">' +
                    '<small>' +
                        '<i class="icon-thumbs-up"></i> ' + this.likes + '&nbsp;&nbsp;&nbsp;' +
                        '<i class="icon-comment"></i> ' + this.comments + '&nbsp;&nbsp;&nbsp;' +
                        v +
                    '</small>' +
                '</p>' +
                '<div id="player-container-' + this.id + '" class="collapse">&nbsp;</div>' +
            '</div>' +
        '</div>';

    return res;
};

function User() {
    this.id = null;
    this.name = null;
}

User.prototype.init = function (data) {
    this.id = data.id != undefined ? data.id : null;
    this.name = data.name != undefined ? data.name : null;
};
