import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupCronService } from './group-cron.service';

@Module({
    controllers: [GroupController],
    providers: [GroupService, GroupCronService],
    exports: [GroupService],
})
export class GroupModule { }
