var website = (function () {
// Responsive state management
	var responsiveStates = (function() {

		function init() {
			ssm.addStates([
				{
					id: 'xs',
					maxWidth: 767,
					colorbox: false,
					onEnter: function(){
						console.log('Enter mobile');
					},
					onLeave: function(){
						console.log('Leave mobile');
					}
				},
				{
					id: 'sm',
					minWidth: 768,
					maxWidth: 991,
					colorbox: false
				},
				{
					id: 'md',
					minWidth: 992,
					maxWidth: 1199
				},
				{
					id: 'lg',
					minWidth: 1200
				}
			]);
			ssm.ready();
		}

		function current(state) {
			var states = ssm.getCurrentStates();

			for (var prop in states) {
				if (states.hasOwnProperty(prop)) {
					if (states[prop].id === state) {
						return true;
					}
				}
			}

			return false;
		}

        return {
            init: init,
            current: current
        };
	}());


// Cookies
    var cookiePolicy = (function(){
    	var $cookie = $('#cookie');

        function init() {
            var cookie = Cookies.get('CLIENTNAMEcookie');

            if(cookie === undefined){
            	$cookie.addClass('active');
                $cookie.on('click','.close', close);
                Cookies.set('CLIENTNAMEcookie', 'true', { expires: 60*60*24*365 });
            }
            else{
                close();
            }
        }

        function close() {
            $cookie.remove();
            return false;
        }

        return {
            init: init
        };
	}());


// Form validation, add class of .form-vaildate around the form to validate
	var siteForms = (function () {
		var $forms = $('.form-validate');

		function init() {
			$forms.bootstrapValidator({
				excluded: [':disabled'],
				feedbackIcons: {
				valid: 'icon-ok',
				invalid: 'icon-cancel',
				validating: 'icon-loading'
				}
			});
		}

		return {
			init: function () {
				if ($forms.length) {
					init();
				}
			}
		};
	}());


// Global init function
	return {
		init: function () {
			responsiveStates.init();

			cookiePolicy.init();

			siteForms.init();

			// SVG fallback
			if (!Modernizr.svg) {
				$('img[src*="svg"]').attr('src', function () {
					return $(this).attr('src').replace('.svg', '.png');
				});
			}

			$('input, textarea').placeholder();

		}

	};

}());

$(document).ready(website.init);
