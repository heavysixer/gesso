/*
  Cart Class
  The Cartridge class controls all the game specific logic, each cartridge will be unique based on
  the type of game that is to be played.
*/
function Cart(opts) {
    this.useAnimations = false;
    this.canvas = undefined;
    this.width = 704;
    this.height = 600;

    // Assets to load
    this.remoteAssets = [];

    // Assets available for display
    this.assets = {
        labels: []
    };

    var that = this;
    function init(opts) {
        that.scenes = [];
        that.scene = undefined;
        that.sceneLoaded = false;
        that.sceneIndex = 0;
        jQuery.extend(true, that, opts);
    }
    init(opts);
}

Cart.prototype.render = function() {
    if (this.sceneLoaded === true && this.scene !== undefined && this.scene.render !== undefined) {
        this.scene.render();
    }
};

Cart.prototype.addScene = function(scene) {
    scene.cart = this;
    this.scenes.push(scene);
};

Cart.prototype.goToScene = function(scene) {
    this.lastScene = this.scene;
    if (this.scenes.length > 0) {
        if (typeof(scene) === "number") {
            this.scene = this.scenes[scene];
            this.sceneIndex = scene;
        } else if (typeof(scene) == 'string') {
            var len = this.scenes.length;
            for (var x = 0; x < len; x++) {
                if (this.scenes[x].name === scene) {
                    this.sceneIndex = x;
                    this.scene = this.scenes[x];
                }
            }
        } else {
            throw ('unknown scene type');
        }
        var that = this;
        if (this.lastScene) {
            if (typeof(this.lastScene.onUnload) === 'function') {
                this.lastScene.onUnload(this,
                function() {
                    that.lastScene.removeLayers();
                });
            } else {
                this.lastScene.removeLayers();
            }
        }
        this.sceneLoaded = false;

        if (typeof(this.scene.onLoad === 'function')) {
            this.scene.onLoad(this,
            function() {
                that.sceneLoaded = true;
            });
        } else {
            this.sceneLoaded = true;
        }
    } else {
        throw ("A Cartridge requires at least one scene");
    }
};

Cart.prototype.draw = function() {
    var layer;
    var len = this.scene.layers.labels.length;
    for (var x = 0; x < len; x++) {
        layer = this.scene.layers[this.scene.layers.labels[x]];
        this.drawSprites(layer.sprites);
        this.updateButtons(layer.buttons, layer.sprites);
        if (typeof(layer.afterRender) === 'function') {
            layer.afterRender();
        }
    }
};

Cart.prototype.drawSprites = function(a) {
    var sprite,
    len;
    len = a.labels.length;
    try {
        for (var i = 0; i < len; i++) {
            sprite = a[a.labels[i]];

            // Only draw sprite sthat are visible to the player.
            var diagonal = Math.sqrt(sprite.width  * sprite.height * 2);

            if (sprite.x + diagonal >= 0 && sprite.y + diagonal >= 0 && sprite.x <= this.width && sprite.y <= this.height) {
                sprite.draw(this.gesso.ctx);
            }
        }
    } catch(e) {
        this.gesso.ctx.restore();
        console.log(e);
        console.log(sprite);
    }
};

Cart.prototype.updateButtons = function(buttons, sprites) {
    var s,
    len,
    b;
    len = buttons.length;
    var offset = jQuery(this.canvas).offset();
    try {
        for (var i = 0; i < len; i++) {
            b = buttons[i];
            s = sprites[b];
            jQuery('#' + b).css({
                left: (s.x + offset.left) + 'px',
                top: (s.y + offset.top) + 'px'
            });
        }
    } catch(e) {
        console.log(e);
        console.log(sprite);
    }
};

/*
  Scene Class
  The Scene class is used to split the game up into logical chunks.
*/
function Scene(opts) {
    this.name = null;
    var that = this;

    // Public Methods
    this.addLayer = function(opts) {
        opts.scene = this;
        var layer = new Layer(opts);

        // Super basic normalization
        layer.id = opts.name.replace(/\s/g, '');
        if (this.layers[layer.id] === undefined) {
            this.layers.labels.push(layer.id);
            this.layers[layer.id] = layer;
        } else {
            throw ('A layer name must be used only once per scene');
        }
        return layer;
    };

    this.layerAt = function(index) {
        return this.layers[this.layers.labels[index]];
    };

    this.removeLayers = function() {
        if (that.layers !== undefined) {
            var len = that.layers.labels.length;
            for (var x = 0; x < len; x++) {
                that.layers[that.layers.labels[x]].remove();
            }
        }
        that.layers = {
            labels: []
        };
    };

    function init(opts) {
        that.removeLayers();
        jQuery.extend(true, that, opts);
    }

    init(opts);
}

/*
  Layer Class
  Sprites used in a scene are organized into layers, which have are z-ordered by the scene
*/
function Layer(opts) {
    var _nextId = 0;
    this.name = null;
    this.sprites = {
        labels: []
    };
    this.buttons = [];
    var that = this;

    function getNextId() {
        _nextId++;
        return this.name + _nextId;
    }

    function init(opts) {
        if (opts.name) {
            this.name = opts.name;
        }
        if (opts.sprites) {
            for (var x in opts.sprites) {
                that.addSprite(opts.sprites[x]);
            }
            delete opts.sprites;
        }
        jQuery.extend(true, that, opts);
    }

    this.nextId = function() {
        return getNextId();
    };

    this.removeSprites = function() {
        this.sprites = {
            labels: []
        };
    };

    this.sprite = function(opts) {
        var s = new Sprite(opts);
        return s;
    };

    this.addSprite = function(opts) {
        opts.id = this.nextId();
        var sprite = this.sprite(opts);
        sprite.layer = this;
        this.sprites.labels.push(sprite.id);
        this.sprites[sprite.id] = sprite;
        if (sprite.clickable === true) {
            this.buttons.push(sprite.id);
        }
        return sprite;
    };

    this.removeSprite = function(id) {
        var len = this.sprites.labels.length;
        for (var x = 0; x < len; x++) {
            if (this.sprites.labels[x] === id && x > 0 && x < len - 1) {
                this.sprites.labels.splice(x, 1);
                this.sprites[id] = null;
                delete this.sprites[id];
                break;
            }
        }
    };

    this.remove = function() {
        var len = this.buttons.length;
        for (var x = 0; x < len; x++) {
            jQuery('#' + this.buttons[x]).remove();
        }
    };

    init(opts);
}

/*
  TextElement Class
  This class contains formatting options for sprites that include text.
*/
function TextElement(opts) {
    var that = this;
    this.value = undefined;
    this.x = 0;
    this.y = 0;
    this.alpha = 1.0;
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    this.shadowBlur = 0;
    this.shadowColor = 'rgb(0,0,0)';

    // supports: start, end, left, right, center
    this.textAlign = 'start';

    // supports: top, hanging, middle, alphabetic, ideographic, bottom
    this.textBaseline = 'alphabetic';
    this.face = 'Arial';
    this.size = 15;
    this.decoration = '';

    function init(opts) {
        jQuery.extend(true, that, opts);
    }

    this.measureText = function(ctx) {
        return ctx.measureText(this.value).width;
    };

    this.draw = function(ctx) {
        ctx.save();
        ctx.textBaseline = this.textBaseline;
        ctx.shadowOffsetX = this.shadowOffsetX;
        ctx.shadowOffsetY = this.shadowOffsetY;
        ctx.shadowBlur = this.shadowBlur;
        ctx.globalAlpha = this.alpha;
        ctx.shadowColor = this.shadowColor;
        ctx.font = this.font({});
        ctx.fillStyle = this.fillStyle;
        ctx.fillText(this.value, this.x, this.y);
        ctx.restore();
    };

    this.font = function(opts) {
        if (opts) {
            if (opts.decoration) {
                this.decoration = opts.decoration;
            }
            if (opts.face) {
                this.face = opts.face;
            }
            if (opts.size) {
                this.size = opts.size;
            }
        }
        return this.decoration + ' ' + this.size + 'px ' + this.face;
    };

    init(opts);
}

/*
  Frame Sequence Class
  This class is used to linearlly animate a series of images over a specific period of time
*/
function FrameSequence(opts) {
    var that = this;
    this.currentFrame = 0;
    this.interval = 60;
    this.frames = [];
    this.loop = false;
    function init(opts) {
        jQuery.extend(true, that, opts);
        that.goToFrame(0);
        if(that.loop){
          that.update();
        }
    }
    this.update = function() {
        this.currentFrame++;
        var that = this;
        window.setTimeout(function() {
          if (that.currentFrame < that.frames.length) {
              that.goToFrame(that.currentFrame);
          } else {
              that.currentFrame = 0;
              that.goToFrame(0);
          }
          that.update();
        },
        this.interval);
    };

    this.goToFrame = function(index) {
        this.image = this.frames[index].image;
        this.sprite.width = this.image.width;
        this.sprite.height = this.image.height;
        this.currentFrame = index;
    };

    init(opts);
}

/*
  Sprite Class
  The sprite class handles the positioning of visual images on the scene
*/
function Sprite(opts) {
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.width = 0;
    this.height = 0;
    this.visibility = 'visible';
    this.shadowed = false;
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    this.shadowBlur = 0;
    this.shadowColor = 'rgba(0, 0, 0,0.5)';
    this.frameSequence = undefined;
    this.animating = false;
    this.useAnimation = true;
    this.opts = null;
    this.compositeOperation = 'source-over';
    this.alpha = 1.0;
    this.textElement = null;
    this.clickable = false;
    var that = this;
    function init(opts) {
        opts.target = that;
        var frames = opts.frames;
        if (frames) {
            var o = {
                frames: [],
                sprite: that
            };
            if (frames instanceof Array) {
                o.frames = frames;
            } else {
                if (frames.hasOwnProperty('image') === true) {
                    o.frames.push(frames);
                } else {
                  frames.frames = frames.images;
                  delete frames.images;
                  jQuery.extend(true, o, frames);
                }
            }
            that.frameSequence = new FrameSequence(o);
        }

        if (opts.useAnimations !== undefined && (opts.useAnimations === false)) {
            that.useAnimation = false;
        }

        if (opts.attributes) {
            jQuery.extend(true, that, opts.attributes);
        }

        if (opts.id !== undefined) {
            that.id = opts.id;
        }

        if (opts.text) {
            that.textElement = new TextElement(opts.text);
            that.textElement.x = that.x;
            that.textElement.y = that.y;
        }

        if (opts.render && typeof(opts.render) === 'function') {
            jQuery(document).bind('render',
            function() {
                opts.render();
            });
        }

        if (opts.onKeyUp && typeof(opts.onKeyUp) === 'function') {
            jQuery(document).bind('onKeyUp',
            function() {
                opts.onKeyUp();
            });
        }

        if (opts.mouseUp && typeof(opts.mouseUp) === 'function') {
            that.clickable = true;
            var e = jQuery('<div />', {
                'id': that.id,
                'class': 'clickable',
                'style': "position:absolute;z-index:100;width:" + that.width + "px;height:" + that.height + "px;"
            });
            jQuery('body').append(e);
            jQuery('#' + that.id).bind('click.forCanvas',
            function(event) {
                opts.mouseUp(event);
            });
        }

        if (opts.init && typeof(opts.init) === 'function') {
            opts.init();
        }
    }

    /*
    function: Animate

    Animates a sprite on a canvas over time. This method updates the sprites attributes only, it is still
    up to the renderer to draw it to the canvas.

    Parameters: opts, duration

      opts: - Hash
        attributes: - Hash
          Each attribute of the hash should be something that can be animated overtime like the x,y or opacity.
          The first item in the array will be the start position, the second item is the end position. You can
          include an optional third item, which must be a name of an easing function (see jquery.easing.1.3.js)

        delay: (optional) Integer - Number of seconds to delay the start of this animation.
        repeat: (optional) String - If blank then no repeat otherwise it will repeat "cyclical" or as a "yoyo"
        duration: (optional) Integer - the total amount of time this animation should take.
        onComplete: (optional) Function - Called when animation completes. In the case of repeating animations this will be called
                  everytime a cycle of the animation completes.

    Examples:
    sprite.aniate({
      attributes: {
        x : [0,100, "swing"]
        y : [0,10]
      },
      duration: 1000
      })

  */
    this.animate = function(opts) {
        if (this.useAnimation === true) {
            this.prepareAnimation(opts);
        } else {
            for (var p in opts.attributes) {
                this[p] = opts.attributes[p][1];
                opts.onComplete();
            }
        }
    };

    this.prepareAnimation = function(opts) {
        var d = (opts.duration === undefined) ? 1000: opts.duration;
        var delay = (opts.delay === undefined) ? 0: opts.delay;
        this.animating = true;
        this.opts = opts;
        this.before = {
            target: this,
            properties: []
        };
        this.after = {};
        for (var p in opts.attributes) {
            this.before.properties.push(p);
            this.before[p] = opts.attributes[p][0];
            this.after[p] = (opts.attributes[p].length > 2) ? new Array(opts.attributes[p][1], opts.attributes[p][2]) : opts.attributes[p][1];
        }
        jQuery(this.before).delay(delay).animate(this.after, {
            duration: d,
            step: function() {
                var len = this.properties.length;
                for (var x = 0; x < len; x++) {
                    this.target[this.properties[x]] = this[this.properties[x]];
                }
            },
            complete: function() {
                for (var p in this.properties) {
                    this.target[this.properties[p]] = this.target.after[this.properties[p]];
                }
                if (this.target.opts.repeat) {
                    if (this.target.opts.repeat === 'yoyo') {
                        this.target.swapDirection();
                    }
                    this.target.animate(this.target.opts);
                } else {
                    this.target.animating = false;
                }
                if (this.target.opts.onComplete) {
                    this.target.opts.onComplete(this.target);
                }
            }
        });
    };

    this.moveTo = function(x, y) {
        if (this.useAnimation === true) {
            jQuery(this.before).stop();
            this.opts.attributes["x"][0] = this.x;
            this.opts.attributes["x"][1] = x;
            this.opts.attributes["y"][0] = this.y;
            this.opts.attributes["y"][1] = y;
            this.animate(this.opts);
        }
        this.x = x;
        this.y = y;
    };

    this.image = function() {
        if (arguments.length > 0) {
            this.frameSequence.image = arguments[0];
        }
        return this.frameSequence.image;
    };

    this.swapDirection = function() {
        var a,
        b;
        for (var i in this.opts.attributes) {
            a = this.opts.attributes[i][0];
            b = this.opts.attributes[i][1];
            this.opts.attributes[i][0] = b;
            this.opts.attributes[i][1] = a;
        }
    };

    this.goToFrame = function(index) {
        this.frameSequence.goToFrame(index);
    };

    this.draw = function(ctx) {
        var image = (typeof(this.frameSequence) !== 'undefined') ?  this.frameSequence.image : null;
        if (this.visibility === 'visible') {
            ctx.save();
            if (this.shadowed === true) {
                ctx.shadowOffsetX = this.shadowOffsetX;
                ctx.shadowOffsetY = this.shadowOffsetY;
                ctx.shadowBlur = this.shadowBlur;
                ctx.shadowColor = this.shadowColor;
            }
            ctx.globalAlpha = this.alpha;
            ctx.globalCompositeOperation = this.compositeOperation;
            if (image !== null) {
                ctx.save();
                ctx.translate(this.x + (this.width/2), this.y + this.height/2);
                ctx.rotate(this.angle * Math.PI/180);
                ctx.drawImage(image, 0, 0, this.width, this.height, -this.width/2, -this.height/2, this.width, this.height);
                ctx.restore();
            }

            if (this.textElement !== null) {
                this.height = this.textElement.size;
                this.width = this.textElement.measureText(ctx);
                this.textElement.draw(ctx);
            }
            ctx.restore();
        }
    };

    this.text = function(str) {
        if (str !== undefined) {
            this.textElement.value = str;
        }
        return this.textElement.value;
    };

    init(opts);
}

/*
  CountdownTimer Class
*/
function CountdownTimer(opts) {
    this.timeLeft = 0;
    this.timeLimit = 0;
    this.percentLeft = 0;
    this.timeoutId = undefined;
    this.onComplete = undefined;

    this.tick = function() {
        this.percentLeft = 0;
        --this.timeLeft;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            if (this.onComplete !== undefined) {
                this.onComplete();
                delete this.timeoutId;
            }
        } else {
            var target = this;
            this.timeoutId = window.setTimeout(function() {
                target.tick();
            },
            1000);
        }
        this.percentLeft = parseInt(((this.timeLeft / this.timeLimit) * 100), 10);
    };

    this.addTime = function(seconds) {
        this.timeLeft = this.timeLeft += seconds;
    };

    this.cancel = function(){
      if(typeof this.timeoutId === "number") {
            window.clearTimeout(this.timeoutId);
            delete this.timeoutId;
      }
    };

    this.init = function(opts) {
        if (opts !== undefined) {
            if (opts.limit) {
                this.timeLimit = opts.limit;
            }
            if (opts.elapsed) {
                this.timeLeft = opts.limit - opts.elapsed;
            }
            if (opts.onComplete && typeof(opts.onComplete) === 'function') {
                this.onComplete = opts.onComplete;
            }
        }
        this.tick();
    };
    this.init(opts);
}

function Gesso(opts) {
    var that = this;
    this.debug = false;
    this.frameRateInterval = null;
    this.soundChannels = 15;
    this.soundManager = null;
    this.options = {
        canvas: null,
        frameRate: 45
    };

    function init(opts) {
        jQuery.extend(true, that.options, opts);
        that.canvas = that.options.canvas[0];
        that.ctx = that.canvas.getContext('2d');
        that.ctx.mozImageSmoothingEnabled = false;
        that.frameRateInterval = Math.ceil(1000 / that.options.frameRate);
        that.fps = new FPS(that.options.frameRate);
        that.soundManager = new SoundManager({
            maxChannels: that.soundChannels
        });

        // Add animation for browsers that can support it
        if (jQuery.browser.msie !== true) {
            that.useAnimations = true;
        }
    }

    this.getCanvas = function() {
        return that.options.canvas;
    };

    init(opts);
}

Gesso.prototype.main = function() {
    this.render();
    var that = this;
    setTimeout(function() {
        that.main();
    },
    this.frameRateInterval);
    if (this.debug) {
        this.fps.update();
    }
};

Gesso.prototype.render = function() {
    jQuery(document).trigger('render');
    this.cart.render();
};

Gesso.prototype.preloadAssets = function(opts) {
    var len = opts.assets.length;
    var that = this;
    for (var i = 0; i < len; i++) {
        var cacheImage = new Image();
        cacheImage.src = opts.assets[i].src;
        cacheImage.name = opts.assets[i].name;
        jQuery(cacheImage).load(function() {
            var name = jQuery(this).attr('name');
            that.cart.assets.labels.push(name);
            that.cart.assets[name] = {
                image: this
            };
            if (that.cart.assets.labels.length >= len) {
                opts.onLoad();
            } else {
                opts.onChange({
                    asset: this,
                    percentLoaded: parseInt(((that.cart.assets.labels.length / len) * 100), 10)
                });
            }
        });
    }
};

Gesso.prototype.loadCart = function(cart) {
    jQuery.fx.interval = this.frameRateInterval;
    this.cart = cart;
    this.cart.gesso = this;
    if (this.cart.frameRate !== undefined) {
        this.frameRate = this.cart.frameRate;
    }
    this.cart.canvas = this.getCanvas();
    this.cart.soundManager = this.soundManager;
    if (cart.width && cart.height) {
        jQuery(this.canvas).css({
            'width': this.width + 'px',
            'height': this.height + 'px'
        });
    }

    this.cart['onLoad'](this);
    var that = this;
    this.main();
    return this.cart;
};

Gesso.prototype.countdownTimer = function(opts) {
    return new CountdownTimer(opts);
};

/*
  Sound Manager Class
  This class controls the playback of audio within the games
*/
function SoundManager(opts) {
    var that = this;
    this.channels = [];
    this.maxChannels = 10;
    this.audio = undefined;
    this.supportsFileType = false;
    this.audioSupport = undefined;
    var mimeSupport = {
        mp3: {
            name: "MPEG3",
            mime: "audio/mpeg",
            ext: "mp3"
        },
        ogg: {
            name: "Ogg Vorbis",
            mime: "audio/ogg",
            ext: "ogg"
        },
        wav: {
            name: "Wave",
            mime: "audio/x-wav",
            ext: "wav"
        },
        au: {
            name: "Basic",
            mime: "audio/basic",
            ext: "au, snd"
        },
        aif: {
            name: "AIF Format",
            mime: "audio/x-aiff",
            ext: "aif, aifc, aiff"
        }
    };
    function init(opts) {
        jQuery.extend(true, that, opts);
        if (supportsAudio()) {
            for (var x = 0; x < that.maxChannels; x++) {
                that.channels[x] = {
                    channel: new Audio(''),
                    used: false
                };
            }
        }
    }

    function supportsAudio() {
        if (typeof(that.audioSupport) === 'undefined') {
            try {
                that.audio = new Audio("");

                that.audioSupport = !!(that.audio.canPlayType);

            } catch(e) {
                that.audioSupport = false;
            }
        }
        return that.audioSupport;
    }


    function detectSupport(files) {
        if (that.supportsAudio === true) {
            var len = files.length;
            that.supportsFileType = false;
            for (var x = 0; x < len; x++) {
                var format = mimeSupport[files[x].ext];
                if (that.audio.canPlayType(format.mime)) {
                    that.audio.src = files[x].src;
                    that.supportsFileType = true;
                    break;
                }
            }
        }

    }

    function findPlayableFile(files) {
        var len = files.length;
        var file = undefined;
        for (var x = 0; x < len; x++) {
            var format = mimeSupport[files[x].ext];
            if (that.audio.canPlayType(format.mime)) {
                file = files[x];
                break;
            }
        }
        return file;
    }

    this.play = function(opts) {
        var file,
        selectedChannel,
        len;
        file = findPlayableFile(opts.files);
        if (typeof(file) !== 'undefined') {
            len = this.channels.length;
            for (var x = 0; x < len; x++) {
                thistime = new Date();
                if (this.channels[x].used === false) {
                    selectedChannel = this.channels[x];
                    selectedChannel.channel.src = file.src;
                    selectedChannel.channel.load();
                    selectedChannel.channel.play();
                    selectedChannel.used = true;
                    jQuery(selectedChannel.channel).unbind('ended');
                    jQuery(selectedChannel.channel).bind('ended',
                    function(e) {
                        if (opts.ended && typeof(opts.ended) === 'function') {
                            selectedChannel.used = false;
                            opts.ended(e);
                        }
                    });
                    break;
                }
            }
        }
    };

    init(opts);
}

/*
  FPS Class
  This class handles the drawing of a simple frames per second counter.
*/

function FPS(desiredRate) {
    this.frameTimes = null;
    var that = this;
    function init(desiredRate) {
        that.desiredRate = desiredRate;
        that.frameTimes = [];
    }
    this.update = function() {
        var fps = jQuery('#fps');
        if (fps) {
            if (this.frameTimes.length > 30)
            {
                this.frameTimes.splice(0, 1);
            }
            var currTime = new Date().getTime();

            this.frameTimes.push(currTime);
            var frameRateText = 1000 / ((currTime - this.frameTimes[0]) / (this.frameTimes.length - 1)) + "";
            frameRateText = frameRateText.replace(/(^[^.]+\...).*/, "$1") + '/' + (this.desiredRate) + ' FPS';
            fps.html(frameRateText);

            var timeDelta = currTime - this.frameTimes[this.frameTimes.length - 2];

            if (isNaN(timeDelta))
            {
                timeDelta = 0;
            }
        }
    };
    init(desiredRate);
}
