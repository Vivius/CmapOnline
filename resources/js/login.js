import Vue from 'vue';
import VueResource from 'vue-resource';

Vue.use(VueResource);

var sign = new Vue({
    el: '#login',
    data: {
        show: true,
        pseudo: '',
        password: '',
        confirmPassword: '',
        wrongLogin: false
    },
    methods: {
        changes: function () {
            this.show = !this.show;
            this.pseudo = '';
            this.password = '';
        },
        postConnection: function () {
            this.$http.post('/login', { pseudo: this.pseudo, password: this.password}).then(response => {
                if(response.body[0] != null)
                    window.location.href = '/home/';
                else
                    this.wrongLogin = true;
            }, response => {
                console.log('erreur', response.body);
            });
        }
    }
});