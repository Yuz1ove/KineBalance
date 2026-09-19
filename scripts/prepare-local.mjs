import {cpSync} from 'node:fs'
cpSync('dist','kbpd-core/public',{recursive:true})
