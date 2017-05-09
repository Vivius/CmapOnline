import Vue from 'vue/dist/vue.js';
import VueResource from 'vue-resource';

Vue.use(VueResource);

var sign = new Vue({
    el: '#login',
    data: {
        text: 'Or sign up',
        button: 'Login',
        show: false,
        pseudo: '',
        password: ''
    },
    methods: {
        change: function () {
            this.text = this.text == 'Or sign up' ? 'Or sign in' : 'Or sign up';

            if(this.button == 'Sign up') {
                this.button = 'Login';
                this.show = false;
            } else {
                this.button = 'Sign up';
                this.show = true;
            }
        },
        postConnection: function () {
            this.$http.post('/connect', {user: { pseudo: this.pseudo, password: this.password}}).then(response => {
                console.log('success', response);
            }, response => {
                console.log('erreur', response);
            });
        }
    }
})