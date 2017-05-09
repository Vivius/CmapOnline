/**
 * Created by Victor on 09/05/2017.
 */
import  Vue from 'vue/dist/vue';
import VueResource from 'vue-resource';
Vue.use(VueResource);

var app = new Vue({
    el: '#app',
    data: {
        name: '',
        seen: false,
        styleObject: {
            'visibility': 'visible',
        }
    },
    methods: {
        insertGraph: function (event) {
            this.seen = false;
            this.name = '';
            console.log(this.name);
            this.$http.post('/graph/create', {name: this.name }).then(response => {
            }, response => {
            });
        }
    }
})
